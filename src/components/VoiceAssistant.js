// src/components/VoiceAssistant.js
import React, { useState } from 'react';

const VoiceAssistant = ({ userId = 1, onAction, onReply }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  const sendToBackend = async (query) => {
    try {
      const res = await fetch('https://smriti-setu-sih-1.onrender.com/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, query })
      });
      const data = await res.json();
      if (data.reply) {
        onReply(data.reply);
      }
      if (data.action && onAction) {
        onAction(data.action);
      }
    } catch (error) {
      console.error('Voice assistant error:', error);
      onReply('Sorry, I could not reach the server.');
    }
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Your browser does not support speech recognition.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListening(true);
    recognition.start();

    recognition.onresult = (event) => {
      const spokenText = event.results[0][0].transcript;
      setTranscript(spokenText);
      sendToBackend(spokenText);
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        alert('Please allow microphone access.');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };
  };

  return (
    <button
      className={`voice-btn ${isListening ? 'listening' : ''}`}
      onClick={handleVoiceInput}
      disabled={isListening}
      title="Voice Assistant"
    >
      <i className="fas fa-microphone"></i>
    </button>
  );
};

export default VoiceAssistant;
