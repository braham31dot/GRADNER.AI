// Elements
const donateButton = document.getElementById('donate-button');
const donationModal = document.getElementById('donation-modal');
const closeDonationModal = document.getElementById('close-donation-modal');
const uploadButton = document.getElementById('upload-button');
const imageInput = document.getElementById('image-input');
const sendButton = document.getElementById('send-button');
const userInput = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');

// Show donation modal
donateButton?.addEventListener('click', () => {
  donationModal.classList.remove('hidden');
});

// Close donation modal
closeDonationModal?.addEventListener('click', () => {
  donationModal.classList.add('hidden');
});

// Trigger image input
uploadButton?.addEventListener('click', () => {
  imageInput.click();
});

// Handle image selection and upload
imageInput?.addEventListener('change', () => {
  const file = imageInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const img = document.createElement('img');
    img.src = e.target.result;
    img.style.maxWidth = '100px';
    img.style.margin = '5px 0';
    chatBox.appendChild(img);
    handleImageUpload(file); // Handle image upload
  };
  reader.readAsDataURL(file); // Read the file as a Data URL
});

// Display chat message
function appendMessage(from, msg) {
  const messageElement = document.createElement('div');
  messageElement.classList.add('chat-message', from);
  messageElement.textContent = msg;
  messageElement.classList.add('fade-in');
  chatBox.appendChild(messageElement);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Config
const API_URL = 'https://api.openai.com/v1/chat/completions';
const MAX_IMAGES_PER_DAY = 3;

// Allowed topics
const allowedTopics = [
  'plant', 'plants', 'gardening', 'soil', 'earth', 'botany',
  'leaves', 'yellow plant', 'garden', 'shovel', 'photosynthesis',
  'hello', 'hi', 'hey', 'how are you', 'greetings', 'what’s up', 'good morning', 'good evening'
];

function isOffTopic(text) {
  const lowerText = text.toLowerCase();
  return !allowedTopics.some(topic => lowerText.includes(topic)) && !lowerText.includes("aloe vera") && !lowerText.includes("cactus");
}

function containsBadWords(text) {
  const badWords = ['fuck', 'fuck you', 'violence', 'suicide', 'rape', 'kill you',];
  return badWords.some(word => text.toLowerCase().includes(word));
}

// Send message to AI
async function sendTextToAI(userMessage) {
  if (containsBadWords(userMessage)) {
    appendMessage('ai', '⚠️ Please avoid inappropriate language.');
    return;
  }

  if (isOffTopic(userMessage)) {
    appendMessage('ai', '🌱 I can talk about plants, gardening or just chat a little. How can I help you today?');
    return;
  }

  showLoader();

  try {
    const response = await fetch('/api/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: 'You are a plant expert AI. Use emojis like 🌿☀️💧🌸🪴 to keep answers short, helpful, and friendly.' },
          { role: 'user', content: userMessage }
        ]
      })
    });

    const data = await response.json();
    hideLoader();

    if (response.ok && data.reply) {
      appendMessage('ai', data.reply);
    } else {
      appendMessage('ai', '❌ Error: ' + (data.error || 'No reply received'));
    }
  } catch (err) {
    hideLoader();
    appendMessage('ai', '❌ Network error.');
    console.error(err);
  }
}

sendButton?.addEventListener('click', () => {
  const message = userInput.value.trim();
  if (!message) return;
  appendMessage('user', message);
  userInput.value = '';
  sendTextToAI(message);
});

async function handleImageUpload(file) {
  if (checkImageLimit()) {
    appendMessage('ai', '🖼️ Upload limit reached (3 per 24h).');
    return;
  }

  const reader = new FileReader();
  reader.onload = async () => {
    const base64 = reader.result;

    showLoader();
    try {
      const response = await fetch('/api/openai', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, // Use environment variable for API Key
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4-turbo',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: 'What’s in this image?' },
                {
                  type: 'image_url',
                  image_url: {
                    url: base64,
                    detail: 'high'
                  }
                }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Image API Error:', errorText);
        hideLoader();
        appendMessage('ai', '❌ Image analysis failed.');
        return;
      }

      const data = await response.json();
      hideLoader();
      appendMessage('ai', data.choices[0].message.content);
      incrementImageCount();
    } catch (err) {
      hideLoader();
      console.error('Upload Error:', err);
      appendMessage('ai', '❌ Image analysis failed.');
    }
  };

  reader.readAsDataURL(file);
}

function checkImageLimit() {
  const today = new Date().toDateString();
  const record = JSON.parse(localStorage.getItem('imageUploads') || '{}');
  if (record.date !== today) {
    localStorage.setItem('imageUploads', JSON.stringify({ date: today, count: 0 }));
    return false;
  }
  return record.count >= MAX_IMAGES_PER_DAY;
}

function incrementImageCount() {
  const record = JSON.parse(localStorage.getItem('imageUploads'));
  record.count += 1;
  localStorage.setItem('imageUploads', JSON.stringify(record));
}

function showLoader() {
  const loader = document.createElement('div');
  loader.id = 'loader';
  loader.innerText = '💭 Thinking...';
  chatBox.appendChild(loader);
}

function hideLoader() {
  const loader = document.getElementById('loader');
  if (loader) loader.remove();
}

const styleSheet = document.createElement('style');
styleSheet.innerText = `
  .fade-in {
    animation: fadeIn 0.5s ease-in-out;
  }
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;
document.head.appendChild(styleSheet);
