# Django Chatbot Setup Instructions

Follow these detailed steps to set up your Django chatbot application.

## Step 1: Install Requirements

`
pip install -r requirements.txt
`

## Step 2: Create .env File

`
OPENAI_API=your_secret_key_here
`


## Step 3: Create Tables

Before running the application, you need to create the necessary database tables. Run the following Django commands:

`
python manage.py makemigrations
`

`
python manage.py migrate
`

## Step 4: Create a Superuser

`
python manage.py createsuperuser
`


## Step 5: Run the App

Finally, start your Django application by running:

`
python manage.py runserver
`

Now you can visit - `http://127.0.0.1:8000/`  use your username and password to login it.
