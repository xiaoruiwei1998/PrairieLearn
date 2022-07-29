
def normalize_df(df):
    if df.max()-df.min()!=0:
        return (df-df.min())/(df.max()-df.min()) 
    return df

def evidence_generator(e1, e2, e3, time_epsilon):
    """ Add more readable instructions to evidence data """
    
    # generate evidence of answering questions at the same time.
    _e1 = "Out of " + str(e1['n_same_questions']) + "same questions, " + str(len(e1['flagged_questions'])) + " questions " + str(["q"+str(int(q)) for q in e1['flagged_questions']]) + " are answered within " + str(time_epsilon) + " seconds time difference. "
    _e2 = "Out of " + str(e2['n_same_questions']) + "same questions, " + str(len(e2['flagged_questions'])) + " questions " + str(["q"+str(int(q)) for q in e2['flagged_questions']]) + " have the identical answer. "
    _e3 = "Out of " + str(e3['n_same_questions']) + "same questions, " + str(e3['flagged_questions']) + " questions are answered in the same order. Answering orders are " + str(e3['stu1_evidence']) + " and " + str(e3['stu2_evidence']) + " respectively."
    return _e1, _e2, _e3



