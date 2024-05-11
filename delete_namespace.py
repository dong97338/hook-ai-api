from pinecone import Pinecone
from configparser import ConfigParser


namespace = "hook"

config = ConfigParser()
config.read('config.ini')

OPENAI_API_KEY = config['DEFAULT']['OPENAI_API_KEY']
PINECONE_API_KEY = config['DEFAULT']['PINECONE_API_KEY']

pc = Pinecone(api_key=PINECONE_API_KEY)
index = pc.Index("data")

index.delete(namespace=namespace, delete_all=True)
