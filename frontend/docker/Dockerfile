FROM cimg/base:2021.04
USER root
RUN apt-get install software-properties-common
RUN apt-add-repository universe
RUN apt-get update
RUN apt-get install python3 python3-pip ffmpeg
RUN pip install --upgrade youtube-dl awscli
# Get-Content Dockerfile | docker build -
# docker tag <id> chrisshoemaker/fristajl.pl
# docker login
# docker push chrisshoemaker/fristajl.pl