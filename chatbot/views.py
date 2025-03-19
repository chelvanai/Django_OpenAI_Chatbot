import os
from chatbot.models import ChatSession, ChatMessage
from django.shortcuts import get_object_or_404, render
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login
from django.contrib.auth.forms import AuthenticationForm
from django.utils import timezone
from django.contrib.auth import logout
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(api_key=os.getenv('OPENAI_API'))
model_name = "gpt-4o"


@login_required
def chat_page(request):
    return render(request, 'chat.html')


def login_view(request):
    if request.method == 'POST':
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            username = form.cleaned_data.get('username')
            password = form.cleaned_data.get('password')
            user = authenticate(username=username, password=password)
            if user is not None:
                login(request, user)
                return redirect('chat_page')
            else:
                form.add_error(None, 'Username or password is not correct')
    else:
        form = AuthenticationForm()
    return render(request, 'login.html', {'form': form})


def logout_view(request):
    logout(request)
    return redirect('login')


conversations = []
new_chat_state = True
chat_session = None


@login_required
def get_chat_sessions(request):
    # Query the database for all chat sessions, ordered by the 'updated_at' field
    sessions = ChatSession.objects.all().order_by('-updated_at')  # '-' indicates descending order

    # Construct a list of dictionaries for each session
    data = [
        {'chat_uuid': session.chat_uuid, 'chat_title': session.chat_title, 'updated_at': session.updated_at}
        for session in sessions
    ]

    # Return the data as JSON
    return JsonResponse(data, safe=False)  # safe=False is necessary to serialize a list


@login_required
def get_chat_messages(request, chat_uuid):
    global conversations, new_chat_state, chat_session
    # Retrieve the ChatSession by its UUID
    chat_session = get_object_or_404(ChatSession, chat_uuid=chat_uuid)

    # Retrieve all messages linked to the ChatSession
    messages = ChatMessage.objects.filter(chat=chat_session).order_by('time_stamp')

    # Create a list to store the formatted messages
    conversations = [{"role": "system", "content": "You are a helpful assistant"}]

    # Format each message pair into the specified JSON structure
    for message in messages:
        conversations.append({"role": "user", "content": message.user_input})
        conversations.append({"role": "assistant", "content": message.response})

    new_chat_state = False

    # Return the conversation list as a JSON response
    return JsonResponse({"conversation": conversations})


@login_required
def chat_response(request):
    global conversations, new_chat_state, chat_session
    if request.method == 'POST':

        user_input = request.POST.get('message', '')

        if user_input == 'New chat':
            conversations = [{"role": "system", "content": "You are a helpful assistant"}]
            new_chat_state = True

            return JsonResponse({'response': ""})

        else:
            if new_chat_state:
                print("New chat session!")
                conversations.append({"role": "user", "content": user_input})

                response = client.chat.completions.create(
                    model=model_name,
                    messages=conversations,
                )

                assistant_response = response.choices[0].message.content

                conversations.append({"role": "assistant", "content": assistant_response})

                # print(conversations)

                title_prompt = """
                    Generate a concise, descriptive title in English for the following input: {user_input}.
                    The title should be clear, relevant, and free of quotation marks.
                    Return only the title, with no additional explanation.
                """

                title_response = client.chat.completions.create(
                    model=model_name,
                    messages=[{"role": "user",
                               "content": title_prompt.format(user_input=user_input)
                               }]
                )

                # Create a new ChatSession
                chat_title = title_response.choices[0].message.content
                chat_session = ChatSession(chat_title=chat_title, updated_at=timezone.now())
                chat_session.save()

                # Create a new ChatMessage linked to the ChatSession
                chat_message = ChatMessage(chat=chat_session, user_input=user_input, response=assistant_response)
                chat_message.save()

                new_chat_state = False
                return JsonResponse({'response': assistant_response})

            else:
                print("Old chat session!")

                conversations.append({"role": "user", "content": user_input})

                response = client.chat.completions.create(
                    model=model_name,
                    messages=conversations,
                )

                assistant_response = response.choices[0].message.content

                conversations.append({"role": "assistant", "content": assistant_response})

                # print(conversations)

                # Create a new ChatMessage linked to the ChatSession
                chat_message = ChatMessage(chat=chat_session, user_input=user_input, response=assistant_response)
                chat_message.save()

                return JsonResponse({'response': assistant_response})
