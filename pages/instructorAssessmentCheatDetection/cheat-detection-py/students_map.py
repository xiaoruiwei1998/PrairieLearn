import itertools
from utils import *
from pickle import TRUE
import random
# from cv2 import normalize, threshold
import pandas as pd
import numpy as np
import networkx as nx
from times import Times
import csv
import os


class CheatingDetection(object):
    
    # Initialize StudentMap obj by passing in student csv's as a Zip file
    def __init__(self, input_dir, output_dir, opts):
        self.student_files = input_dir
        self.output_dir = output_dir
        self.map = {}
        self.cheat_pairs = {}
        self.CHECK_TIME_time_epsilon = opts["CHECK_TIME_time_epsilon"]
        # self.THRESHOLD = opts["THRESHOLD"]
        self.RULE1_TIME_WEIGHT = opts["RULE1_TIME_WEIGHT"]
        self.RULE2_ANSWER_WEIGHT = opts["RULE2_ANSWER_WEIGHT"]
        self.RULE3_ORDER_WEIGHT = opts["RULE3_ORDER_WEIGHT"]
        self.R1_diff_time_per_question = {}
        
    def __print__(self):
        print("Main map: ")
        print(self.map)
        for student in self.map:
            self.map[student].__printDicts__()

    # Reads csv and returns pandas dataframe DF
    def csv_to_df(self, csv):
        df = pd.read_csv(csv)
        # change 'Time' column to datetime object
        df['Time'] = pd.to_datetime(df['date_iso8601'], utc=True)
        return df
    
    # Updates Time obj for STUDENT
    def process_data(self):
        
        print("processing data")
        # Iterates thorough args (currently student files)
        for csv in self.student_files:
            if ".csv" not in csv:
                continue
            student_df = self.csv_to_df(csv)

            # gets student email, (SHOULD WE GET: student name? or ID)
            student = student_df.loc[0]['auth_user_uid']

            # creates a Times obj inside MAP for every student
            if student not in self.map: #runtime?
                self.map[student] = Times(student)

            # A list of all indexes where question is 'submitted'
            idx_list = student_df.index[student_df['event_name'] == 'Submission'].tolist()

            # Iterates through submissions to get start/end times, populates MAP
            for index in idx_list: #range(len(idx_list), 0, -1)
                
                # gives us the question submitted as string
                question = student_df.loc[index]['instructor_question_number']
                
                # question order given to students
                s_question = student_df.loc[index]['student_question_number']

                # will give us the row right above submission, START TIME
                start = student_df.iloc[index - 1]['Time']
                
                # Gives us submission time
                end = student_df.loc[index]['Time']
                
                response = student_df.loc[index]['data']
                self.map[student].set_time_answer(question, s_question, start, end, response)
                # Reverse ordered dict
        print("mapped!")

    def evaluate(self):
        student_pairs = itertools.combinations(list(self.map.keys()), 2)
        col_name = ['student1', 'student2', 'rule1_violations', 'rule1_prob', 'rule2_violation', 'rule2_prob', 'rule3_violation', 'rule3_prob', 'overall_prob']
        df = pd.DataFrame(columns=col_name)
        for student1, student2 in student_pairs:

            student1_times = self.map[student1]
            student2_times = self.map[student2]

            r1, r1_evidence = self.check_same_time(student1_times, student2_times)
            r2, r2_evidence = self.check_same_answer(student1_times.student_answer, student2_times.student_answer)
            r3, r3_evidence = self.check_same_order(student1_times.q_times, student2_times.q_times)
            r1_evidence, r2_evidence, r3_evidence = evidence_generator(r1_evidence, r2_evidence, r3_evidence, self.CHECK_TIME_time_epsilon)
            
            if student1 not in self.cheat_pairs.keys():
                self.cheat_pairs[student1] = []
                row = {'student1': student1,
                    'student2': student2, 
                    'rule1_violations': r1_evidence, 
                    'rule1_prob': r1, 
                    'rule2_violation': r2_evidence, 
                    'rule2_prob': r2, 
                    'rule3_violation': r3_evidence, 
                    'rule3_prob': r3,                        
                    'overall_prob': 0}
            df = df.append(row, ignore_index=True)
            self.cheat_pairs[student1].append(student2)
                
        # normalization
        df['rule1_prob'] = normalize_df(df['rule1_prob'])
        df['rule2_prob'] = normalize_df(df['rule2_prob'])
        df['rule3_prob'] = normalize_df(df['rule3_prob'])
        df['overall_prob'] = self.RULE1_TIME_WEIGHT*df['rule1_prob'] + self.RULE2_ANSWER_WEIGHT*df['rule2_prob'] + self.RULE3_ORDER_WEIGHT*df['rule3_prob']
        # sort result by overall_prob
        df = df.sort_values('overall_prob', ascending=False)
        df.to_csv(self.output_dir+'/result.csv', index=False)
        
    def generate_detailed_evidence(self, threshold):
        df = pd.read_csv(self.output_dir+'/result.csv')
        # Only include pairs with overall_prob > threshold
        df = df.loc[df['overall_prob']>threshold]
        for i in range(len(df)):
            row = df.loc[i]
            student1, student2 = row['student1'], row['student2']
            # self.generate_detailed_evidence_for_pairs(student1, student2)
        return df
    
    def generate_detailed_evidence_for_pairs(self, student1, student2, output_dir="pl-cheat-detection/detailed_result"):
        
        """ generate more detailed evidence among a pair of student """
        student1_times = self.map[student1]
        student2_times = self.map[student2]
        
        student1_questions = self.get_student_questions(student1_times.q_times)
        student2_questions = self.get_student_questions(student2_times.q_times)
        # print(student1_questions)
        # cols and df for rule#1
        q_cols = []
        for i in range(len(student1_questions)):
            q_cols.append("q"+str(i+1)+"_start")
            q_cols.append("q"+str(i+1)+"_end")
        col1 = ['student']+q_cols
        df1 = pd.DataFrame(columns=col1)
        stu1 = [student1]
        stu2 = [student2]
        diff = abs(stu1-stu2)
        df1.append(stu1)
        df1.append(stu2)
        df1.append(diff)
        
        # Todo: cols and df for rule#2
        col2 = []
        df2 = pd.DataFrame(columns=col1)
        
        # Todo: cols and df for rule#3
        col3 = []
        df3 = pd.DataFrame(columns=col1)
        
        stu_pair = str(student1)+"_"+str(student2)
        if not os.path.exists(output_dir):
            os.mkdir(output_dir)
        if not os.path.exists(output_dir+"/"+stu_pair):
            os.mkdir(output_dir+"/"+stu_pair)
        df1.to_csv(output_dir+"/"+stu_pair+"/time"+".csv")
        df2.to_csv(output_dir+"/"+stu_pair+"/answer"+".csv")
        df3.to_csv(output_dir+"/"+stu_pair+"/order"+".csv")
        
        return
    
    # Rule#1 helper: Generates a map that maps from student_question_times --> student_questions
    def get_student_questions(self, student_q_times):
        student_questions = []
        for question in student_q_times:
            start_time = student_q_times[question][0]
            end_time = student_q_times[question][1]
            student_questions.append((start_time, end_time))
        student_questions.sort()
        return student_questions

    # output [student1-student2] [diff_start] [diff_end] [diff_total]
    def check_same_time(self, student1_times, student2_times):
        
        student1_questions = self.get_student_questions(student1_times.q_times)
        student2_questions = self.get_student_questions(student2_times.q_times)

        intersection_questions = list(set(student1_times.q_times).intersection(student2_times.q_times))
        n_same_questions = len(intersection_questions)
        flagged_questions = []

        for i in range(n_same_questions):
            diff_start_time = abs((student1_questions[i][0] - student2_questions[i][0]).total_seconds())
            diff_end_time = abs((student1_questions[i][1] - student2_questions[i][1]).total_seconds())

            if diff_start_time <= self.CHECK_TIME_time_epsilon and diff_end_time <= self.CHECK_TIME_time_epsilon:
                flagged_questions.append(intersection_questions[i])
        
        evidence = {"n_same_questions": n_same_questions, "flagged_questions": flagged_questions}
        if n_same_questions == 0:
            return 0, evidence
        return len(flagged_questions) / n_same_questions, evidence
    
    def check_same_answer(self, student1_answers, student2_answers):
        counter_same_questions = 0
        counter_same_answer = 0
        flagged_questions = []

        for question in student1_answers:
            if question in student2_answers:
                counter_same_questions = counter_same_questions + 1
                if student1_answers[question] == student2_answers[question]:
                    counter_same_answer = counter_same_answer + 1
                    flagged_questions.append(question)
        ratio = 0
        evidence = {"n_same_questions": counter_same_questions, "flagged_questions": flagged_questions}
        if counter_same_questions > 0:
            ratio = counter_same_answer / counter_same_questions
        return ratio, evidence

    def check_same_order(self, student1_q_times, student2_q_times):
        submissions1 = []
        submissions2 = []
        for question in student1_q_times:
            if question in student2_q_times:
                submissions1.append((student1_q_times[question][1], question))
                submissions2.append((student2_q_times[question][1], question))

        submissions1.sort()
        submissions2.sort()
        evidence1 = ["q"+str(int(e[1])) for e in submissions1]
        evidence2 = ["q"+str(int(e[1])) for e in submissions2]
        counter_same_questions = len(submissions1)
        counter_same_order = 0

        for x in range(counter_same_questions):
            if submissions1[x][1] == submissions2[x][1]:
                counter_same_order = counter_same_order + 1
                
        ratio = 0
        evidence = {"n_same_questions": counter_same_questions, "flagged_questions": counter_same_order, "stu1_evidence": evidence1, "stu2_evidence": evidence2}
        if counter_same_questions > 0:
            ratio = counter_same_order / counter_same_questions
        return ratio, evidence
    

    # Generates a map that maps from student --> instructor question order
    def get_iquestion_order(self):
        student_q = {}
        for student, times in self.map.items():
            question_tuple = times.q_times
            qs = []
            qs = list(question_tuple.keys())
            student_q[student] = qs
        return student_q

    # Generates the student question order for a given student
    # Cleans so output is only question numbers (S-2#1 --> 2)
    def get_squestion_order(self, student):
        student_q = []
        unclean_order = self.map[student].student_question
        for question in unclean_order:
            cleaned = float(question.split("#")[0].split("-")[1])
            student_q.append(cleaned)
        return student_q

    def get_cheating_values(self):
        shared_question_orders = self.get_iquestion_order()
        for s1, s2 in itertools.combinations(shared_question_orders.keys(), 2):
            s1_qs = shared_question_orders[s1]
            s2_qs = shared_question_orders[s2]
            s1_order = self.get_squestion_order(s1)
            s1_out_of_order_count = self.check_in_order(s1_order)
            s2_order = self.get_squestion_order(s2)
            s2_out_of_order_count = self.check_in_order(s2_order)
            if (s1_out_of_order_count == 0 or s2_out_of_order_count == 0):
                # print("student did questions in order")
                return None
            # s1_qs = [1,2,3,4,5,6,7,8,10,9]
            # s2_qs = [1,4,5,6,2,3,7,8,9,10]
            
            different_distance = self.longest_common_subsequence(s1_qs, s2_qs)

            # print("student " + str(s1) + " has " + str(s1_out_of_order_count) + " questions done out of order")
            # print("student " + str(s2) + " has " + str(s2_out_of_order_count) + " questions done out of order")
            # print("These two students differ by " + str(different_distance))
        
        return None

    def longest_common_subsequence(self, s1_qs, s2_qs):
        LCSuff = [[0 for k in range(len(s2_qs)+1)] for l in range(len(s1_qs)+1)]
 
        # To store the length of
        # longest common substring
        result = 0
        # Following steps to build
        # LCSuff[m+1][n+1] in bottom up fashion
        for i in range(1, len(s2_qs) + 1):
            for j in range(1, len(s1_qs) + 1):
                if (s1_qs[i-1] == s2_qs[j-1]):
                    LCSuff[i][j] = LCSuff[i-1][j-1] + 1
                else:
                    LCSuff[i][j] = max(LCSuff[i-1][j], LCSuff[i][j-1])
        result = LCSuff[len(s2_qs)][len(s1_qs)]
        different_distance = max(len(s1_qs), len(s2_qs)) - result
        return different_distance

    def check_in_order(self, student_q_order):
        q_in_order = sorted(student_q_order)
        # print(student_q_order)
        # print(q_in_order)
        return self.longest_common_subsequence(student_q_order, q_in_order)

    #Deprecated functions

    def edit_distance_help(self, arr1, arr2, m, n):
        
        dp = [[0 for x in range(n+1)] for x in range(m+1)]

        for i in range(m+1):
            for j in range(n+1):
                if (i == 0):
                    dp[i][j] = j
                elif (j==0):
                    dp[i][j] = i
                elif (arr1[i-1] == arr2[j-1]):
                    dp[i][j] = dp[i-1][j-1]
                else:
                    dp[i][j] = 1 + min(dp[i][j-1], dp[i-1][j], dp[i-1][j-1])
        return dp[m][n]

    def edit_distance(self):
        # arr1 = [1,6,5,8.1,9.1,12.1,13,4,7,2,3,11.1,14,10.1,17,15,16,18]
        # len1 = len(arr1)
        # arr2 = [1,7,6,9.1,12.1,13,14,17,11.1,16,18,3,2,4,5,15,8.1,10.1]
        # len2 = len(arr2)
        # 1, 6, 9.1, -8.1-, 12.1, 13, -7-, 14, 17, 16, 18
        # print(self.edit_distance_help(arr1, arr2, len1, len2))
        student_question_orders = self.get_question_order()
        # print(student_question_orders)
        for s1, s2 in itertools.combinations(student_question_orders.keys(), 2):
            # s1_qs = student_question_orders[s1]
            # s2_qs = student_question_orders[s2]
            s1_qs = [1,2,3,4,5,6,7,8,10,9]
            s2_qs = [1,4,5,6,2,3,7,8,9,10]
            if (self.check_in_order(s1_qs) or self.check_in_order(s2_qs)):
                # print("student did questions in order")
                return None
            result = self.edit_distance_help(s1_qs,s2_qs, len(s1_qs), len(s2_qs))
            # print("These two students have edit distance of "+ str(result))

    # cheating cluster
    def student_clusters(self):
        cheating_graph = nx.DiGraph(nx.Graph(self.cheat_pairs))
        raw_cycles = list(nx.simple_cycles(cheating_graph))
        cycles = self.clean_cycles(raw_cycles)

        print("cheating clusters: ", cycles)
        return cycles

    def clean_cycles(self, raw_cycles):
        cycles = []
        raw_cycles = sorted([set(i) for i in raw_cycles])
        for i in range(len(raw_cycles)):
            included = False
            for j in range(i+1, len(raw_cycles)):
                if raw_cycles[i].intersection(raw_cycles[j]) == raw_cycles[i]:
                    included = True
                    continue
            if not included:
                cycles.append(raw_cycles[i])
        return cycles
