FROM python:alpine
WORKDIR /build
COPY . /build
ENV PYTHONUNBUFFERED=1
RUN pip install -r requirements.txt
ENTRYPOINT ["gunicorn", "-b", ":31764", "wsgi" ]
