# PL-CheatDetection

[![Latest version](https://img.shields.io/github/tag/PrairieLearn/PrairieLearn.svg?label=version)](https://github.com/PrairieLearn/PrairieLearn/blob/master/ChangeLog.md) [![Dependabot Status](https://api.dependabot.com/badges/status?host=github&repo=PrairieLearn/PrairieLearn)](https://dependabot.com) [![Docker build status](https://img.shields.io/docker/automated/prairielearn/prairielearn.svg)](https://hub.docker.com/r/prairielearn/prairielearn/builds/) [![Build Status](https://img.shields.io/travis/PrairieLearn/PrairieLearn/master.svg)](https://travis-ci.org/PrairieLearn/PrairieLearn) [![Coverage Status](https://coveralls.io/repos/github/PrairieLearn/PrairieLearn/badge.svg?branch=master)](https://coveralls.io/github/PrairieLearn/PrairieLearn?branch=master) [![License](https://img.shields.io/github/license/PrairieLearn/PrairieLearn.svg)](https://github.com/PrairieLearn/PrairieLearn/blob/master/LICENSE)

This repo is for the cheat detection feature on PrairieLearn platform. Instructors can use this feature to generate report for every exam to detect cheating students. Currently, our project is developed and run in python3 environment, and we are working on merging the python project into PL platform as a new feature. 

PrairieLearn is an online problem-driven learning system for creating homeworks and tests. It allows questions to be written using arbitrary HTML/JavaScript, thus enabling very powerful questions that can randomize and autograde themselves, and can access client- and server-side libraries to handle tasks such as graphical drawing, symbolic algebra, and student code compilation and execution.

## PL Developer Environment Setup
1. Clone the repo
```
git clone https://github.com/PrairieLearn/PrairieLearn.git
```
2. Run the docker container
```
docker run -it --rm -p 3000:3000 -w /PrairieLearn -v /path/to/PrairieLearn:/PrairieLearn prairielearn/prairielearn /bin/bash
```
You can now run the following commands inside the container:
3. Install Node packages. Repeat after switching branches or pulling new code.
```
yarn
```
4. Transpile code in the `packages/` directory. Repeat after switching branches, pulling new code, or editing JS/TS in `packages/`.
```
make build
```
5. Run the PrairieLearn server.
```
make start
```
Now you can Ctrl-C and run "make start" again to restart PrairieLearn (after code edits, for example) or Ctrl-C to stop PL and Ctrl-D to exit the container

## Run Anti-Cheating Python Version

1. Clone the code
```
git clone https://github.com/xiaoruiwei1998/PL-CheatDetection.git
```
2. cd into the project directory
```
cd PL-CheatDetection
```
3. Switch to the [python-version-project](https://github.com/xiaoruiwei1998/PL-CheatDetection/tree/python-version-project) branch
```
git checkout python-version-project
```
4. Download exam data
   If url to an exam is https://cbt-dev.berkeley.edu/pl/course_instance/1/instructor/assessment/23/questions, the course_id=1, and the assessment_id=23
```
python3 Anonymizer/cd_api_download.py -t instructor_token -i course_id (an integer) -a assessment_id (an integer) -o output_path
```
5. Convert exam data format
```
python3 Anonymizer/json_to_csv.py -i input_path -o output_path
```
6. Anonymizing the data
```
python3 Anonymizer/anonymizer.py -i input_path -o output_path
```
7. Compare students' submissions by running
```
python3 pl-cheat-detection/main.py -d inputdir -w1 weight_for_rule_1 -w2 weight_for_rule_2 -w3 weight_for_rule_3
# e.g. python3 pl-cheat-detection/main.py -d fa20E2cleanedOutput -w1 0.4 -w2 0.3 -w3 0.3
```

## Citation
[1] PL Documentation website: [http://prairielearn.readthedocs.io/](http://prairielearn.readthedocs.io/)

