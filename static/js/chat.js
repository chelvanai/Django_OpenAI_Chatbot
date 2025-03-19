document.addEventListener("DOMContentLoaded", () => {
    let new_chat_state = true;

    const input = document.getElementById("userInput");
    const newBtn = document.getElementById("newChatButton");
    const logoutBtn = document.getElementById("logoutButton");
    const sendBtn = document.getElementById("sendButton");
    const chatLinks = document.querySelectorAll('#labelsList a');

    chatLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault()
            const chatId = this.getAttribute('data-chat-id');
            loadChatDetails(chatId);
        });
    });

    startNewChat();

    input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = `${input.scrollHeight}px`;
    });


    marked.setOptions({
        breaks: true,
        gfm: true
    });

    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    logoutBtn.addEventListener('click', () => {
        fetch('/logout/', {
            method: 'GET',
            headers: {'X-CSRFToken': getCookie('csrftoken')},
            credentials: 'same-origin'
        }).then(response => {
            if (response.ok) {
                window.location.href = '/login/';
            } else {
                alert('Logout failed. Please try again.');
            }
        }).catch(error => {
            console.error('Error during logout:', error);
            alert('Logout failed due to a network error.');
        });
    });


    function loadChatDetails(chatId) {
        fetch(`/api/chat/${chatId}/`)
            .then(response => response.json())
            .then(data => {
                const chatMessages = document.getElementById('chatMessages');
                chatMessages.innerHTML = '';

                data.conversation.forEach(message => {
                    // Check role to append properly
                    const messageType = message.role === "user"
                        ? 'user-message'
                        : message.role === "assistant"
                            ? 'bot-message'
                            : null;

                    if (messageType) {
                        appendMessage(message.content, messageType);
                    }

                });
            })
            .catch(error => console.error('Failed to fetch chat details:', error));
    }

    function display_previous_chat() {
        fetch('/api/chat_id_title/')
            .then(response => response.json())
            .then(data => {
                const labelsList = document.getElementById('labelsList');
                labelsList.innerHTML = '';

                // Sort the data by chat_id in descending order
                data.sort((a, b) => b.chat_id - a.chat_id);

                data.forEach(chat => {
                    const li = document.createElement('li');
                    const a = document.createElement('a');
                    a.textContent = chat.chat_title;
                    a.href = "#";
                    a.setAttribute('data-chat-id', chat.chat_uuid);
                    a.addEventListener('click', function (e) {
                        e.preventDefault();
                        console.log(chat.chat_uuid);
                        loadChatDetails(chat.chat_uuid);
                    });
                    li.appendChild(a);
                    labelsList.appendChild(li);
                });
            })
            .catch(error => {
                console.error('Error fetching chat titles:', error);
            });
    }

    function startNewChat() {
        // Clear the chat messages from the UI
        document.getElementById('chatMessages').innerHTML = '';

        // Send the special message to clear the conversations on the server
        $.ajax({
            url: '/api/chat/',
            method: 'POST',
            data: {
                message: 'New chat',
            },
            headers: {'X-CSRFToken': getCookie('csrftoken')},
            success: function (data) {
                console.log('Chat session reset successfully.');
                display_previous_chat();
                new_chat_state = true;
            },
            error: function (xhr) {
                console.error('Error resetting chat session: ' + xhr.statusText);
            }
        });

        document.getElementById('userInput').value = '';
    }

    newBtn.addEventListener("click", startNewChat);


    function sendMessage() {
        var message = input.value.trim();
        if (message !== "") {
            appendMessage(message, 'user-message');
            input.value = "";
            input.style.height = '50px'
            input.focus();

            $.ajax({
                url: '/api/chat/',
                method: 'POST',
                data: {message: message},
                headers: {'X-CSRFToken': getCookie('csrftoken')},
                success: function (data) {
                    appendMessage(data.response, 'bot-message');
                    if (new_chat_state) {
                        display_previous_chat();
                    }
                    new_chat_state = false;
                },
                error: function (xhr) {
                    appendMessage("Error: " + xhr.statusText, 'bot-message');
                }
            });

        }

    }

    sendBtn.addEventListener("click", sendMessage);

    function appendMessage(text, className) {
        const messageDiv = document.createElement("div");
        messageDiv.className = 'chat-message ' + className;
        var chatMessages = document.getElementById("chatMessages");

        if (className === 'user-message') {
            messageDiv.textContent = text;

            chatMessages.appendChild(messageDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;

        } else {
            text = text
                .replace(/\\\[(.+?)\\\]/gs, '$$$$ $1 $$$$')
                .replace(/\\\((.+?)\\\)/g, '$$ $1 $$')

            text = text
                .replace(/\$\$\s*(.+?)\s*\$\$/gs, '<div class="mathjax-block">$$ $1 $$</div><br>')

            messageDiv.innerHTML = marked.parse(text);
            chatMessages.appendChild(messageDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;

            // console.log(marked.parse(text))

            document.querySelectorAll('pre code').forEach((block) => {
                // Ensure that this block doesn't already have a copy button
                const preElement = block.parentNode;
                if (!preElement.classList.contains('button-initialized')) {
                    // Add a class or attribute as a flag to prevent adding more than one button
                    preElement.classList.add('button-initialized');

                    // Create a copy button
                    const copyButton = document.createElement('button');
                    copyButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clipboard-check"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg>`;
                    copyButton.classList.add('copy-btn');
                    copyButton.addEventListener('click', () => copyCode(copyButton));

                    // Append the button to the parent of the code block
                    preElement.appendChild(copyButton);

                    // Highlight the block
                    hljs.highlightBlock(block);
                }
            });

            const mathDivs = document.querySelectorAll('.chat-message.bot-message');
            MathJax.typesetPromise(mathDivs).then(() => {
                console.log("MathJax typesetting finished for selected divs.");
            }).catch((err) => {
                console.error("Typesetting failed: ", err);
            });
        }

    }

    function copyCode(button) {
        // Get the code text within the same code-snippet container as the button
        const codeSnippet = button.parentNode.querySelector('pre code');
        // Create a temporary textarea element to copy the text
        const tempInput = document.createElement('textarea');
        tempInput.value = codeSnippet.textContent;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);

        // Change the button content to a "Copied" icon
        const copiedIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-check-big"><path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/></svg>`;
        const copyIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clipboard-check"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg>`;

        button.innerHTML = copiedIcon;

        // Revert back to the "Copy" icon after 2 seconds
        setTimeout(() => {
            button.innerHTML = copyIcon;
        }, 2000);
    }


    document.getElementById("userInput").addEventListener("keypress", function (event) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });


});
