from TikTokApi import TikTokApi
#import boto3
import os
#from botocore.exceptions import ClientError

#api = TikTokApi.get_instance()
results = 100

def pushResultsToS3(string, bucket, object_name):
    """Upload a file to an S3 bucket
    :param string: String to upload as a file
    :param bucket: Bucket to upload to
    :param object_name: S3 object name. If not specified then file_name is used
    :return: True if file was uploaded, else False
    """
    #encoded_string = string.encode("utf-8")
    #s3 = boto3.resource("s3")
    #try:
    #  s3.Bucket(bucket).put_object(Key=object_name, Body=encoded_string)
    #except ClientError as e:
    #  print(e)
    #  return False
    #return True
    
def main(): #(event, context):
    # Since TikTok changed their API you need to use the custom_verifyFp option. 
    # In your web browser you will need to go to TikTok, Log in and get the s_v_web_id value.
    f = open("/data/tiktoks.txt", "a")
    with TikTokApi() as api:
        for trending_video in api.trending.videos():
        # Prints the id of the tiktok
            print(trending_video)
            f.write(trending_video + "\n")
                #.video.playAddr
    f.close()
    #pushResultsToS3(tiktok, "fristajl-prod-tiktoks", "tiktoks.txt")

main()

# docker run -it -v D:\Projekty\fristajl.pl\s3_content\tiktok\:/data --rm tiktokapi:latest python3 /data/getTikTok.py
