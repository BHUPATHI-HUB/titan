'use client';

import { useChat } from '@ai-sdk/react';
import { useState, useRef, useEffect } from 'react';

interface ChatSession {
  id: string;
  title: string;
  messages: any[];
  createdAt: Date;
  updatedAt: Date;
}

export default function Chat() {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { messages, sendMessage, setMessages } = useChat({
    onFinish: () => {
      setIsTyping(false);
      setIsSending(false);
      // Save the updated messages to current chat
      if (currentChatId) {
        saveChatToStorage(currentChatId, messages);
      }
    }
  });

  // Track if we're currently sending a message
  const [isSending, setIsSending] = useState(false);

  // Load chat sessions from localStorage on component mount
  useEffect(() => {
    const savedChats = localStorage.getItem('titan-chat-sessions');
    if (savedChats) {
      try {
        const parsedChats = JSON.parse(savedChats).map((chat: any) => ({
          ...chat,
          createdAt: new Date(chat.createdAt),
          updatedAt: new Date(chat.updatedAt)
        }));
        setChatSessions(parsedChats);
        console.log('Loaded chats:', parsedChats);
      } catch (error) {
        console.error('Error parsing saved chats:', error);
        setChatSessions([]);
      }
    }
  }, []);

  // Load dark mode preference
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('titan-dark-mode');
    if (savedDarkMode) {
      const isDark = JSON.parse(savedDarkMode);
      setDarkMode(isDark);
      console.log('Loaded dark mode:', isDark);
    }
  }, []);

  // Clean up empty chats when component mounts
  useEffect(() => {
    if (chatSessions.length > 0) {
      cleanupEmptyChats();
    }
  }, []);

  // Save dark mode preference and apply to document
  useEffect(() => {
    localStorage.setItem('titan-dark-mode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    console.log('Dark mode changed to:', darkMode);
  }, [darkMode]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Generate a title from the first user message
  const generateChatTitle = (firstMessage: string): string => {
    const words = firstMessage.split(' ').slice(0, 6);
    return words.join(' ') + (firstMessage.split(' ').length > 6 ? '...' : '');
  };

  // Save chat to localStorage
  const saveChatToStorage = (chatId: string, messages: any[]) => {
    const updatedChats = chatSessions.map(chat => 
      chat.id === chatId 
        ? { ...chat, messages, updatedAt: new Date() }
        : chat
    );
    setChatSessions(updatedChats);
    localStorage.setItem('titan-chat-sessions', JSON.stringify(updatedChats));
  };

  // Clean up empty chats (chats with no messages)
  const cleanupEmptyChats = () => {
    const nonEmptyChats = chatSessions.filter(chat => chat.messages.length > 0);
    if (nonEmptyChats.length !== chatSessions.length) {
      setChatSessions(nonEmptyChats);
      localStorage.setItem('titan-chat-sessions', JSON.stringify(nonEmptyChats));
    }
  };

  // Clear all chats
  const clearAllChats = () => {
    setChatSessions([]);
    setCurrentChatId('');
    setMessages([]);
    localStorage.removeItem('titan-chat-sessions');
  };

  // Create a new chat session
  const createNewChat = () => {
    const newChatId = Date.now().toString();
    const newChat: ChatSession = {
      id: newChatId,
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    setCurrentChatId(newChatId);
    setMessages([]);
    setChatSessions(prev => {
      const updated = [newChat, ...prev];
      localStorage.setItem('titan-chat-sessions', JSON.stringify(updated));
      console.log('Created new chat:', newChat);
      return updated;
    });
  };

  // Switch to a different chat
  const switchToChat = (chatId: string) => {
    const chat = chatSessions.find(c => c.id === chatId);
    if (chat) {
      setCurrentChatId(chatId);
      setMessages(chat.messages);
      setSidebarOpen(false); // Close sidebar on mobile
    }
  };

  // Delete a chat session
  const deleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedChats = chatSessions.filter(chat => chat.id !== chatId);
    setChatSessions(updatedChats);
    localStorage.setItem('titan-chat-sessions', JSON.stringify(updatedChats));
    
    // If we're deleting the current chat, switch to another chat or clear
    if (currentChatId === chatId) {
      if (updatedChats.length > 0) {
        // Switch to the first available chat
        switchToChat(updatedChats[0].id);
      } else {
        // No chats left, clear everything
        setCurrentChatId('');
        setMessages([]);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isSending) {
      // If this is the first message in a new chat, create a new chat session
      if (!currentChatId || messages.length === 0) {
        const newChatId = Date.now().toString();
        const newChat: ChatSession = {
          id: newChatId,
          title: generateChatTitle(input),
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        setCurrentChatId(newChatId);
        setChatSessions(prev => [newChat, ...prev]);
        localStorage.setItem('titan-chat-sessions', JSON.stringify([newChat, ...chatSessions]));
      }
      
      setIsSending(true);
      setIsTyping(true);
      sendMessage({ text: input });
      setInput('');
    }
  };

  const clearChat = () => {
    // Only create a new chat if we have messages in the current chat
    if (messages.length > 0) {
      createNewChat();
    } else {
      // Just clear the current chat if it's empty
      setCurrentChatId('');
      setMessages([]);
    }
  };

  return (
    <div className={`flex h-screen ${darkMode ? 'dark' : ''} transition-colors duration-300`}>
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 w-80 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transform transition-transform duration-300 ease-in-out`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-xl">T</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">Titan</h1>
                <p className="text-sm text-slate-600 dark:text-slate-300">AI Chatbot</p>
              </div>
            </div>
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 p-6 space-y-4 bg-white dark:bg-slate-800">
            <button
              onClick={createNewChat}
              className="w-full flex items-center space-x-3 px-4 py-3 text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>New Chat</span>
            </button>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wide">Recent Chats</h3>
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {(() => {
                  const nonEmptyChats = chatSessions.filter(chat => chat.messages.length > 0);
                  return nonEmptyChats.length > 0 ? (
                    nonEmptyChats.map((chat) => (
                    <div
                      key={chat.id}
                      onClick={() => switchToChat(chat.id)}
                      className={`group relative p-3 rounded-xl cursor-pointer transition-colors ${
                        currentChatId === chat.id
                          ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                            {chat.title}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-300 mt-1">
                            {chat.messages.length} messages • {chat.updatedAt.toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={(e) => deleteChat(chat.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-all duration-200"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))
                  ) : (
                    <div className="text-sm text-slate-500 dark:text-slate-400 p-3 rounded-lg text-center">
                      No recent chats
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Sidebar Footer */}
          <div className="p-6 border-t border-slate-200 dark:border-slate-700 space-y-3 bg-white dark:bg-slate-800">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="flex items-center space-x-2 px-3 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                {darkMode ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
                <span className="text-sm">{darkMode ? 'Light' : 'Dark'}</span>
              </button>
            </div>
            
            {(() => {
              const nonEmptyChats = chatSessions.filter(chat => chat.messages.length > 0);
              return nonEmptyChats.length > 0;
            })() && (
              <button
                onClick={clearAllChats}
                className="w-full flex items-center space-x-2 px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span className="text-sm">Clear All Chats</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        {/* Header */}
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm shadow-sm border-b border-slate-200 dark:border-slate-700">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <div>
                  <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                    {currentChatId && chatSessions.find(c => c.id === currentChatId)?.title || 'Titan The AI Chatbot'}
                  </h1>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {currentChatId ? `${messages.length} messages` : 'Powered by Google Gemini'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={clearChat}
                  className="px-4 py-2 text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Clear Chat
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
            {messages.length === 0 && (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse-glow">
                  <span className="text-white font-bold text-3xl">T</span>
                </div>
                <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-3">Welcome to Titan!</h2>
                <p className="text-lg text-slate-600 dark:text-slate-300 mb-8">Your intelligent AI assistant is ready to help</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                  <div className="p-4 bg-white dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">💬 Chat</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300">Ask questions and get instant answers</p>
                  </div>
                  <div className="p-4 bg-white dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">🔍 Search</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300">Get real-time information from the web</p>
                  </div>
                  <div className="p-4 bg-white dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">🤖 AI Powered</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300">Powered by Google Gemini AI</p>
                  </div>
                </div>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} ${
                  index === messages.length - 1 ? 'animate-fade-in' : ''
                }`}
              >
                <div
                  className={`max-w-4xl px-6 py-5 rounded-2xl ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                      : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-lg border border-slate-200 dark:border-slate-600'
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    {message.role === 'assistant' && (
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-white font-bold text-sm">T</span>
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="text-sm font-semibold mb-2 opacity-90">
                        {message.role === 'user' ? 'You' : 'Titan'}
                      </div>
                      <div className="whitespace-pre-wrap text-base leading-relaxed">
          {message.parts.map((part, i) => {
            switch (part.type) {
              case 'text':
                return <div key={`${message.id}-${i}`}>{part.text}</div>;
                            default:
                              return null;
                          }
                        })}
                      </div>
                    </div>
                    {message.role === 'user' && (
                      <div className="w-10 h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-white font-bold text-sm">U</span>
                      </div>
                    )}
                  </div>
                </div>
        </div>
      ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-lg border border-slate-200 dark:border-slate-600 rounded-2xl px-6 py-5">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <span className="text-white font-bold text-sm">T</span>
                    </div>
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Container */}
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-t border-slate-200 dark:border-slate-700">
          <div className="max-w-5xl mx-auto px-4 py-6">
            <form onSubmit={handleSubmit} className="relative">
              <div className="flex items-end space-x-4">
                <div className="flex-1 relative">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask Titan anything..."
                    disabled={isSending}
                    rows={1}
                    className="w-full px-6 py-4 pr-14 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 disabled:opacity-50 resize-none min-h-[56px] max-h-32"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
                        handleSubmit(e);
                      }
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isSending}
                    className="absolute right-3 bottom-3 w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl flex items-center justify-center hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {isSending ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="mt-3 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Press Enter to send, Shift+Enter for new line
                </p>
              </div>
      </form>
          </div>
        </div>
      </div>
    </div>
  );
}