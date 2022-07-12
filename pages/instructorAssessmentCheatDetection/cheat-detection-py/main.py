
# Download exam data
# run python3 cd_api_download.py with the -t -i -a -o arguments set to the appropriate values

# convert json files to csv files
# run python3 json_to_csv.py with the -i -o arguments

# Anonymizing 
# run python3 anonymizer.py with the -i -o arguments

# Result and Evidence
# run python3 main.py -d -w1 -w2 -w3 to generate result file



from students_map import CheatingDetection
import sys
import os
import argparse

TIME_EPSILON = 60
OBSERVED_THRESHOLD = 0.7

parser = argparse.ArgumentParser(description='Cheat Detecting')
parser.add_argument('-d', '--input-dir', required=True, help='directory of csv files to process')
parser.add_argument('-o', '--output-dir', required=True, help='directory to store result (a .csv file)')
parser.add_argument('-w1', '--r1-weight', required=True, help='weight of same time')
parser.add_argument('-w2', '--r2-weight', required=True, help='weight of same answer')
parser.add_argument('-w3', '--r3-weight', required=True, help='weight of same order')
args = parser.parse_args()

input_dir = args.input_dir 
output_dir = args.output_dir
r1_weight = float(args.r1_weight)
r2_weight = float(args.r2_weight)
r3_weight = float(args.r3_weight)

# when inputs are files: todo

# when input is a dir
files = [input_dir + '/' + f for f in os.listdir(input_dir)]

cheating_detection = CheatingDetection(files, output_dir,
                        {"CHECK_TIME_time_epsilon": TIME_EPSILON,
                         "RULE1_TIME_WEIGHT": r1_weight, 
                         "RULE2_ANSWER_WEIGHT": r2_weight, 
                         "RULE3_ORDER_WEIGHT": r3_weight}
                        )
cheating_detection.process_data()
cheating_detection.evaluate()
# cheating_detection.generate_detailed_evidence(OBSERVED_THRESHOLD)
# cheating_detection.generate_detailed_evidence_for_pairs(88, 207)
# cheating_detection.student_clusters()


# cheating_detection.longest_common_subsequence()
# cheating_detection.get_cheating_values()


# First rule: Check time
# student_1: 2(start,finish) 3(start,finish)
# student_2: 3(start,finish) 2(start,finish) 1(start,finish)


# Second rule: check answer


# Third rule: check order
# order by finish time
# compare

# longest common subsequence
# 2 3 5 1
# 2 3 1

# 2 3 5 1 2 3 4
# 2 3 1 2 3 4 5





