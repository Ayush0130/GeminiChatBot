import React, { useState, useEffect, useRef } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { solarizedlight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import './App.css';

function App() {
  const [question, setQuestion] = useState('');
  const [conversation, setConversation] = useState([]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  const backendUrl = 'https://geminichatbot-rfk5.onrender.com' || 'http://localhost:5000';


  const askQuestion = async () => {
    if (!question.trim()) return;

    
    setConversation(prev => [...prev, { role: 'user', content: question }]);
    setQuestion('');
    setLoading(true);

    try {
      const response = await fetch(`${backendUrl}/chat/stream`, {// calling chat with stream
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: question }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;
      let botMessage = '';

      
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;

        if (value) {
          const chunk = decoder.decode(value);
          const cleanedChunk = chunk.replace(/data: /g, ''); 

          
          botMessage += cleanedChunk;

          
          setConversation(prevConversation => {
            const lastMessage = prevConversation[prevConversation.length - 1];
            if (lastMessage && lastMessage.role === 'bot') {
          
              return [
                ...prevConversation.slice(0, -1),
                { role: 'bot', content: botMessage },
              ];
            } else {
              return [
                ...prevConversation,
                { role: 'bot', content: botMessage },
              ];
            }
          });
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setConversation(prev => [
        ...prev,
        { role: 'user', content: question },
        { role: 'bot', content: 'Error: Could not get a response' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  const handleCopyToClipboard = (code) => {
    navigator.clipboard.writeText(code).then(() => {
      alert('Code copied to clipboard!');
    });
  };

  const formatMessage = (message) => {
    const lines = message.split('\n').map((line, idx) => {
      if (line.startsWith('* ')) {
        const content = line.slice(2); 
        const boldedContent = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        return <li key={idx} dangerouslySetInnerHTML={{ __html: boldedContent }} />;
      } 
      
      else if (line.startsWith('```') && line.endsWith('```')) {
        const codeContent = line.slice(3, -3); 
        const language = 'cpp'; 

        return (
          <div key={idx} className="code-block">
            <SyntaxHighlighter language={language} style={solarizedlight}>
              {codeContent}
            </SyntaxHighlighter>
            <button onClick={() => handleCopyToClipboard(codeContent)}>Copy</button>
          </div>
        );
      } 
      
      else {
        const boldedText = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        return <span key={idx} dangerouslySetInnerHTML={{ __html: boldedText }} />;
      }
    });

    return <ul>{lines}</ul>; 
  };

  return (
    <div className="app-container">
      <h1 className="app-title">Gemini AI Chat</h1>

      <div className="chat-box">
        {conversation.length === 0 ? ( 
          <div className="welcome-message">
            <h2>Welcome to Gemini AI Chat!</h2>
            <p>How can I help you today?</p>
            <p>Please ask me anything to get started.</p>
          </div>
        ) : (
          conversation.map((msg, index) => (
            <div key={index} className={`chat-message ${msg.role}`} aria-live="polite">
              <div className="message-content">
                {msg.role === 'bot' ? (
                  <div>
                    <strong>Gemini:</strong>
                    {formatMessage(msg.content)}
                  </div> 
                ) : (
                  <div>
                    <strong>You:</strong> {msg.content}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {loading && <div className="loading-indicator">Gemini is typing...</div>}
        <div ref={chatEndRef} />
      </div>

      <div className="input-box">
        <textarea
          className="input-textarea"
          rows="2"
          placeholder="Type your question..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              askQuestion();
            }
          }}
        />
        <button className="send-button" onClick={askQuestion} disabled={loading || !question.trim()}>
          {loading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
}

export default App;
