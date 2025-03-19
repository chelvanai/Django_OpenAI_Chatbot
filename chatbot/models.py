from django.db import models
import uuid


class ChatSession(models.Model):
    chat_uuid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    chat_title = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField()

    def __str__(self):
        return self.chat_title


class ChatMessage(models.Model):
    chat = models.ForeignKey(ChatSession, on_delete=models.CASCADE)
    user_input = models.TextField()
    response = models.TextField()
    time_stamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Message from {self.time_stamp}"
