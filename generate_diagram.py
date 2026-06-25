from diagrams import Diagram, Cluster, Edge
from diagrams.onprem.client import User, Users
from diagrams.onprem.compute import Server
from diagrams.onprem.database import Postgresql, Mongodb
from diagrams.azure.storage import BlobStorage
from diagrams.onprem.queue import Kafka
from diagrams.saas.communication import Email
from diagrams.saas.chat import Slack
from diagrams.onprem.network import Internet
from diagrams.programming.framework import React
from diagrams.onprem.container import Docker
from diagrams.custom import Custom

# Note: You might need to install diagrams: pip install diagrams
# Note: Graphviz is required to be installed on the system.

with Diagram("Shikshak Architecture", show=False, direction="LR"):
    user = User("User")

    with Cluster("FRONTEND"):
        web = React("Web Frontend")
        mobile = React("Mobile Frontend")
    
    gateway = Server("API Gateway")
    
    with Cluster("MICROSERVICES"):
        auth_service = Server("Auth Service")
        rag_service = Server("RAG Service")
        course_service = Server("Course Service")
        payment_service = Server("Payment Service")
    
    with Cluster("DATABASES"):
        auth_db = Postgresql("Auth DB")
        auth_vector_db = Postgresql("Auth Vector DB")
        # Placing Course DB below Cloud Blob Storage is logical grouping
        blob_storage = BlobStorage("Cloud Blob Storage")
        course_db = Mongodb("Course DB")

    kafka = Kafka("Kafka")
    email = Email("Email")
    payment_gateway = Internet("Payment Gateway")

    # Connections
    user >> [web, mobile] >> gateway
    
    gateway >> auth_service
    gateway >> rag_service
    gateway >> course_service
    gateway >> payment_service

    auth_service >> auth_db
    
    rag_service >> auth_vector_db
    rag_service >> blob_storage
    
    # Updated connection: Course Service to Course DB
    course_service >> course_db
    # Course Service also likely interacts with Blob Storage for video uploads, but User asked for Course DB
    course_service >> blob_storage 
    
    payment_service >> payment_gateway
    payment_service >> Edge(label="Payment Successful") >> kafka
    
    course_service >> Edge(label="video and notes updated") >> kafka
    course_service >> Edge(label="grant access To User") >> kafka
    
    kafka >> email

    # RAG accessing blob storage
    blob_storage >> rag_service 
