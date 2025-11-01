'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { useChat, type UIMessage } from '@ai-sdk/react';
import { MessageCircle, Plus, Send, Trash2, Loader2 } from 'lucide-react';

/* ---------- Interfaces ---------- */
interface ChatSession {
  id: string;
  title: string;
  messages: UIMessage[];
  createdAt: Date;
  updatedAt: Date;
}

/* ---------- Helper ---------- */
function extractText(m: UIMessage): string {
  if (!m) return '';
  if (Array.isArray((m as any).parts)) {
    return (m as any).parts.map((p: any) => (p?.text ?? '')).join('').trim();
  }
  return (m as any).content ?? '';
}

/* ---------- Animated Header ---------- */
function AnimatedTitle() {
  const title = 'TITAN';
  const subtitle = 'Your Personal AI Assistant';

  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.04, delayChildren: 0.12 } },
  };

  const child: Variants = {
    hidden: { y: -8, opacity: 0, filter: 'blur(6px)' },
    show: {
      y: 0,
      opacity: 1,
      filter: 'blur(0px)',
      transition: { ease: 'easeOut', duration: 0.45 },
    },
  };

  return (
    <motion.div initial="hidden" animate="show" variants={container} className="select-none">
      <div className="flex items-end space-x-3">
        <div className="flex items-baseline">
          {Array.from(title).map((ch, i) => (
            <motion.span
              key={i}
              variants={child}
              style={{ display: 'inline-block' }}
              className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#58A6FF] drop-shadow-[0_6px_20px_rgba(88,166,255,0.25)]"
            >
              {ch}
            </motion.span>
          ))}
        </div>
        <motion.div variants={child} className="text-xs md:text-sm text-[#C9D1D9] opacity-90 ml-2">
          {subtitle}
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ---------- Canvas Nebula Background ---------- */
function NebulaBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const stars = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2 + 0.5,
      dx: (Math.random() - 0.5) * 0.3,
      dy: (Math.random() - 0.5) * 0.3,
      glow: Math.random() * 15 + 5,
    }));

    let animationFrameId: number;
    const draw = () => {
      ctx.fillStyle = 'rgba(10, 10, 25, 0.25)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (const s of stars) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = '#58A6FF';
        ctx.shadowBlur = s.glow;
        ctx.shadowColor = '#58A6FF';
        ctx.fill();

        s.x += s.dx;
        s.y += s.dy;

        if (s.x < 0 || s.x > canvas.width) s.dx *= -1;
        if (s.y < 0 || s.y > canvas.height) s.dy *= -1;
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id="nebula"
      className="fixed top-0 left-0 w-full h-full z-0"
    />
  );
}

/* ---------- Suggestion Chips ---------- */
function SuggestionChips({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-3 justify-center md:justify-start">
      {items.map((t, i) => (
        <motion.div
          key={t + i}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: [0, 1, 0.9], y: [5, 0, 2], scale: [0.98, 1, 0.99] }}
          transition={{
            delay: 0.08 * i,
            duration: 1.4,
            repeat: Infinity,
            repeatDelay: 6,
            repeatType: 'mirror',
          }}
          className="backdrop-blur-sm bg-white/5 border border-white/10 text-sm px-4 py-2 rounded-full text-[#C9D1D9] shadow-sm"
        >
          {t}
        </motion.div>
      ))}
    </div>
  );
}

/* ---------- Main Page ---------- */
export default function Page() {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const suggestions = [
    'Search everything here — instant answers',
    'Ask Titan to analyze code snippets',
    'Generate commit messages or PR descriptions',
    'Brainstorm architecture ideas',
  ];

  const { messages, sendMessage, setMessages } = useChat({
    onFinish: () => setIsTyping(false),
    onError: (err: unknown) => {
      console.error('Chat Error:', err);
      setIsTyping(false);
    },
  });

  const createNewChat = () => {
    const id = Date.now().toString();
    const newChat: ChatSession = {
      id,
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setChatSessions((p) => [newChat, ...p]);
    setCurrentChatId(id);
    setMessages([]);
  };

  const selectChat = (id: string) => {
    const t = chatSessions.find((c) => c.id === id);
    if (!t) return;
    setCurrentChatId(id);
    setMessages(t.messages || []);
  };

  const deleteChat = (id: string) => {
    setChatSessions((p) => {
      const filtered = p.filter((c) => c.id !== id);
      if (filtered.length === 0) {
        setCurrentChatId(null);
        setMessages([]);
      } else if (currentChatId === id) {
        setCurrentChatId(filtered[0].id);
        setMessages(filtered[0].messages || []);
      }
      return filtered;
    });
  };

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault?.();
    const text = inputValue.trim();
    if (!text) return;
    setInputValue('');
    setIsTyping(true);
    await sendMessage({ text });
  };

  return (
    <main className="min-h-screen bg-[#0D1117] text-[#C9D1D9] relative overflow-hidden">
      <NebulaBackground />

      {/* Header */}
      <header className="relative z-20 border-b border-[#0f1418]">
        <div className="max-w-7xl mx-auto px-4 py-5 flex items-center justify-between gap-4">
          <AnimatedTitle />
          <div className="text-sm text-[#8B949E]">© {new Date().getFullYear()} Titan</div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="max-w-7xl mx-auto px-4 py-8 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {/* Sidebar */}
          <aside>
            <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={createNewChat}
                  className="flex items-center gap-2 px-3 py-2 rounded-full bg-[#58A6FF] text-black font-semibold shadow-md hover:brightness-105 transition"
                >
                  <Plus size={16} /> New Chat
                </button>
              </div>
              <div className="mb-4">
                <SuggestionChips items={suggestions} />
              </div>

              <div className="space-y-3 max-h-[56vh] overflow-auto">
                {chatSessions.length === 0 ? (
                  <div className="text-center py-8 text-[#8B949E]">No recent chats</div>
                ) : (
                  chatSessions.map((chat) => (
                    <motion.div
                      key={chat.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => selectChat(chat.id)}
                      className={`p-3 rounded-xl cursor-pointer flex items-start justify-between gap-3 ${
                        chat.id === currentChatId
                          ? 'bg-[#071226] border border-[#58A6FF]/25'
                          : 'hover:bg-[#071221]'
                      } transition`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-[#0B1623]">
                          <MessageCircle size={18} color="#58A6FF" />
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-white">{chat.title}</div>
                          <div className="text-xs text-[#8B949E] mt-1">
                            {chat.messages?.length ?? 0} messages
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteChat(chat.id);
                        }}
                        className="text-[#F78166] hover:text-[#ff8a71] p-1 rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </aside>

          {/* Chat Area */}
          <section className="relative">
            <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-2xl p-5 shadow-xl min-h-[60vh] flex flex-col">
              <div className="mb-4">
                <SuggestionChips items={suggestions} />
              </div>

              <div className="flex-1 overflow-auto mb-4 space-y-4 px-1">
                {(!messages || messages.length === 0) ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-16 text-[#8B949E]"
                  >
                    <div className="text-xl font-semibold text-[#58A6FF]">Welcome to Titan</div>
                    <div className="mt-2">
                      Type a message — suggestions above will help you get started.
                    </div>
                  </motion.div>
                ) : (
                  <AnimatePresence initial={false}>
                    {messages.map((m: UIMessage, i: number) => {
                      const txt = extractText(m);
                      const isUser = (m as any).role === 'user';
                      return (
                        <motion.div
                          key={(m as any).id ?? i}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className={`max-w-[76%] ${
                            isUser ? 'ml-auto text-black' : 'mr-auto text-[#C9D1D9]'
                          }`}
                        >
                          <div
                            className={`p-3 rounded-2xl ${
                              isUser ? 'bg-[#58A6FF]' : 'bg-[#07101a] border border-[#11161b]'
                            }`}
                          >
                            <div className="whitespace-pre-wrap leading-relaxed">{txt}</div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                )}
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 text-[#58A6FF]"
                  >
                    <Loader2 size={16} className="animate-spin" />
                    <span>Titan is thinking...</span>
                  </motion.div>
                )}
              </div>

              <form onSubmit={submit} className="flex items-center gap-3">
                <input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Search everything or ask Titan..."
                  className="flex-1 bg-transparent border border-[#11161b] rounded-full px-4 py-3 outline-none text-[#C9D1D9] placeholder-[#6f7680]"
                />
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  whileHover={{ scale: 1.03 }}
                  disabled={!inputValue.trim()}
                  type="submit"
                  className="bg-[#58A6FF] text-black font-semibold px-4 py-2 rounded-full shadow"
                >
                  <Send size={15} /> &nbsp; Send
                </motion.button>
              </form>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
