import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  BookOpen, 
  ShieldCheck, 
  Cpu, 
  Globe, 
  Image as ImageIcon, 
  Menu, 
  X, 
  User, 
  Bot,
  Loader2,
  Trash2,
  Languages
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getTutorResponse, analyzeImage } from './lib/gemini';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const TOPICS = [
  { id: 'cybersecurity', name: 'Cybersecurity', icon: ShieldCheck, description: 'Kujilinda na ma-hackers na virusi.' },
  { id: 'programming', name: 'Programming', icon: Cpu, description: 'Kuandika code na ku-build ma-apps.' },
  { id: 'networking', name: 'Networking', icon: Globe, description: 'Jinsi comp zina-communicate kwa internet.' },
  { id: 'data-science', name: 'Data Science', icon: BookOpen, description: 'Ku-analyze data na kupata insights.' },
];

const LANGUAGES = [
  { id: 'sheng', name: 'Sheng', label: 'Mtaa Mix', icon: '🇰🇪' },
  { id: 'english', name: 'English', label: 'Professional', icon: '🇬🇧' },
  { id: 'swahili', name: 'Swahili', label: 'Sanifu', icon: '🇹🇿' },
];

const UI_LABELS: Record<string, any> = {
  sheng: {
    topics: "Topics za Mtaa",
    languages: "Lugha ya Kuchagua",
    placeholder: "Uliza swali ya STEM hapa...",
    online: "Tuko Online",
    clear: "Futa Chat",
    thinking: "ShengSTEM anafikiria kidogo...",
    tip: "Tip: Unaweza ku-upload picha ya diagram na ShengSTEM ata-explain!"
  },
  english: {
    topics: "STEM Topics",
    languages: "Select Language",
    placeholder: "Ask a STEM question here...",
    online: "Online Now",
    clear: "Clear Chat",
    thinking: "ShengSTEM is thinking...",
    tip: "Tip: You can upload a diagram and ShengSTEM will explain it!"
  },
  swahili: {
    topics: "Mada za STEM",
    languages: "Chagua Lugha",
    placeholder: "Uliza swali la STEM hapa...",
    online: "Tuko Hewani",
    clear: "Futa Mazungumzo",
    thinking: "ShengSTEM anatafakari...",
    tip: "Kidokezo: Unaweza kupakia picha ya mchoro na ShengSTEM ataielezea!"
  }
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('shengstem-chat');
    return saved ? JSON.parse(saved) : [
      { 
        id: '1', 
        role: 'assistant', 
        content: "Sasa msee! Mimi ni **ShengSTEM**, tutor wako wa mtaa. Unataka kuelewa nini leo? Tuko na topics za cybersecurity, programming, na zingine mob. Hebu niulize swali yoyote ya STEM!", 
        timestamp: Date.now() 
      }
    ];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('shengstem-lang') || 'sheng';
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('shengstem-chat', JSON.stringify(messages));
    localStorage.setItem('shengstem-lang', language);
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, language]);

  const handleSend = async (text: string = input) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Prepare history for Gemini
    const history = messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }));

    const response = await getTutorResponse(text, history, language);

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: response || 'Eish, kuna error kidogo. Jaribu tena.',
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, assistantMessage]);
    setIsLoading(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = (event.target?.result as string).split(',')[1];
      setIsLoading(true);
      
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: `[Picha ya STEM] - Hebu nielezee hii diagram au concept iko hapa.`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, userMessage]);

      const prompts: Record<string, string> = {
        sheng: "Hebu nielezee hii picha ya STEM ukitumia Sheng na analogies za mtaa.",
        english: "Please explain this STEM image using clear English and relatable analogies.",
        swahili: "Tafadhali nielezee picha hii ya STEM ukitumia Kiswahili Sanifu na mifano ya mtaa."
      };

      const response = await analyzeImage(base64, file.type, prompts[language] || prompts.sheng, language);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response || 'Wueh, hiyo picha imenishinda. Jaribu ingine.',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const clearChat = () => {
    if (window.confirm('Unataka kufuta chat yote?')) {
      setMessages([{ 
        id: '1', 
        role: 'assistant', 
        content: "Sasa msee! Mimi ni **ShengSTEM**, tutor wako wa mtaa. Unataka kuelewa nini leo?", 
        timestamp: Date.now() 
      }]);
    }
  };

  const labels = UI_LABELS[language] || UI_LABELS.sheng;

  return (
    <div className="flex h-screen bg-[#F0F7FF] font-sans text-blue-900 overflow-hidden">
      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-blue-900/30 backdrop-blur-md lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-80 bg-white/90 backdrop-blur-xl border-r border-blue-100/50 transform transition-transform duration-500 ease-out lg:relative lg:translate-x-0 shadow-2xl lg:shadow-none",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="p-8 border-b border-blue-50/50 flex items-center justify-between bg-gradient-to-br from-blue-50/50 to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black shadow-lg shadow-blue-200 rotate-3 hover:rotate-0 transition-transform cursor-default">S</div>
              <div>
                <h1 className="text-2xl font-black tracking-tighter text-blue-900 italic leading-none">ShengSTEM</h1>
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Tutor wa Mtaa</span>
              </div>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
            {/* Language Selection Cards */}
            <div>
              <h2 className="px-2 text-[11px] font-bold text-blue-300 uppercase tracking-[0.2em] mb-4">{labels.languages}</h2>
              <div className="grid grid-cols-1 gap-2">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.id}
                    onClick={() => setLanguage(lang.id)}
                    className={cn(
                      "group relative flex items-center gap-4 p-3 rounded-2xl transition-all duration-300 border-2",
                      language === lang.id 
                        ? "bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-100 -translate-y-0.5" 
                        : "bg-white border-blue-50 text-blue-600 hover:border-blue-200 hover:bg-blue-50/50"
                    )}
                  >
                    <span className="text-2xl">{lang.icon}</span>
                    <div className="text-left">
                      <div className="text-sm font-bold">{lang.name}</div>
                      <div className={cn("text-[10px] font-medium", language === lang.id ? "text-blue-100" : "text-blue-400")}>
                        {lang.label}
                      </div>
                    </div>
                    {language === lang.id && (
                      <motion.div 
                        layoutId="active-lang"
                        className="absolute right-4 w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Topic Cards */}
            <div>
              <h2 className="px-2 text-[11px] font-bold text-blue-300 uppercase tracking-[0.2em] mb-4">{labels.topics}</h2>
              <div className="space-y-3">
                {TOPICS.map((topic) => (
                  <button
                    key={topic.id}
                    onClick={() => {
                      setSelectedTopic(topic.id);
                      handleSend(`Hebu nielezee kidogo kuhusu ${topic.name}`);
                      setIsSidebarOpen(false);
                    }}
                    className={cn(
                      "w-full group p-4 rounded-2xl transition-all duration-300 border-2 text-left relative overflow-hidden",
                      selectedTopic === topic.id 
                        ? "bg-blue-50 border-blue-600 shadow-md" 
                        : "bg-white border-blue-50 hover:border-blue-200 hover:shadow-lg hover:-translate-y-0.5"
                    )}
                  >
                    <div className={cn(
                      "absolute -right-4 -top-4 w-16 h-16 rounded-full opacity-5 transition-transform group-hover:scale-150",
                      selectedTopic === topic.id ? "bg-blue-600" : "bg-blue-400"
                    )} />
                    <div className="flex items-start gap-4 relative z-10">
                      <div className={cn(
                        "p-2.5 rounded-xl transition-colors",
                        selectedTopic === topic.id ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-600 group-hover:bg-blue-200"
                      )}>
                        <topic.icon size={20} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-blue-900">{topic.name}</div>
                        <div className="text-[11px] text-blue-400 leading-tight mt-1 font-medium">
                          {topic.description}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-blue-50/50 bg-blue-50/20">
            <button 
              onClick={clearChat}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-xs font-bold text-red-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all border-2 border-transparent hover:border-red-100"
            >
              <Trash2 size={16} />
              {labels.clear}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-white relative">
        {/* Header */}
        <header className="h-20 border-b border-blue-50/50 flex items-center justify-between px-6 lg:px-10 bg-white/90 backdrop-blur-xl sticky top-0 z-30">
          <div className="flex items-center gap-5">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-3 text-blue-600 hover:bg-blue-50 rounded-2xl lg:hidden transition-colors shadow-sm border border-blue-50"
            >
              <Menu size={24} />
            </button>
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-200 overflow-hidden">
                  <Bot size={28} />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-4 border-white rounded-full shadow-sm" />
              </div>
              <div>
                <h2 className="text-base font-black text-blue-900 tracking-tight">ShengSTEM Tutor</h2>
                <span className="text-[10px] text-blue-400 font-black uppercase tracking-[0.2em]">{labels.online}</span>
              </div>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-xs font-black text-blue-900 uppercase tracking-wider">Mzee wa STEM</span>
              <span className="text-[10px] text-blue-400 font-bold italic">Kenya's #1 AI Tutor</span>
            </div>
            <div className="h-10 w-[1px] bg-blue-50 mx-2" />
            <div className="flex -space-x-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600 shadow-sm">
                  {String.fromCharCode(64 + i)}
                </div>
              ))}
            </div>
          </div>
        </header>

        {/* Chat Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 lg:p-12 space-y-8 scroll-smooth bg-[radial-gradient(#E0F0FF_1px,transparent_1px)] [background-size:24px_24px]"
        >
          {messages.map((message) => (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              key={message.id}
              className={cn(
                "flex gap-4 max-w-[90%] lg:max-w-[80%]",
                message.role === 'user' ? "ml-auto flex-row-reverse" : ""
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-lg",
                message.role === 'user' ? "bg-white text-blue-600 border border-blue-50" : "bg-blue-600 text-white"
              )}>
                {message.role === 'user' ? <User size={20} /> : <Bot size={20} />}
              </div>
              <div className={cn(
                "p-5 rounded-3xl shadow-xl shadow-blue-900/5 relative",
                message.role === 'user' 
                  ? "bg-blue-600 text-white rounded-tr-none" 
                  : "bg-white text-blue-900 rounded-tl-none border border-blue-50"
              )}>
                <div className={cn(
                  "prose prose-sm max-w-none",
                  message.role === 'user' 
                    ? "prose-invert prose-p:text-blue-50 prose-strong:text-white" 
                    : "prose-blue prose-headings:text-blue-900 prose-strong:text-blue-900 prose-code:text-blue-600 prose-code:bg-blue-50 prose-code:px-1.5 prose-code:rounded-lg"
                )}>
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
                <div className={cn(
                  "text-[9px] mt-3 font-bold uppercase tracking-widest opacity-40",
                  message.role === 'user' ? "text-right text-blue-100" : "text-left text-blue-400"
                )}>
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </motion.div>
          ))}
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-4"
            >
              <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-100">
                <Loader2 size={20} className="animate-spin" />
              </div>
              <div className="bg-white border border-blue-50 p-5 rounded-3xl rounded-tl-none shadow-xl shadow-blue-900/5 italic text-blue-400 text-sm font-medium">
                {labels.thinking}
              </div>
            </motion.div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-6 lg:p-10 bg-white/80 backdrop-blur-xl border-t border-blue-50/50">
          <div className="max-w-4xl mx-auto relative">
            <div className="flex items-end gap-3 bg-blue-50/50 rounded-[2rem] p-3 border-2 border-blue-50 focus-within:border-blue-400 focus-within:bg-white focus-within:shadow-2xl focus-within:shadow-blue-200/50 transition-all duration-500">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-3.5 text-blue-400 hover:text-blue-600 hover:bg-white rounded-2xl transition-all shadow-sm hover:shadow-md active:scale-95"
                title="Upload picha ya STEM"
              >
                <ImageIcon size={24} />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                className="hidden" 
                accept="image/*"
              />
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={labels.placeholder}
                className="flex-1 bg-transparent border-none focus:ring-0 text-base py-3 px-2 resize-none max-h-40 min-h-[48px] text-blue-900 placeholder:text-blue-300 font-medium"
                rows={1}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className={cn(
                  "p-4 rounded-2xl transition-all duration-500",
                  input.trim() && !isLoading 
                    ? "bg-blue-600 text-white shadow-xl shadow-blue-200 hover:scale-110 hover:-rotate-3 active:scale-90" 
                    : "bg-blue-100 text-blue-300 cursor-not-allowed"
                )}
              >
                <Send size={24} />
              </button>
            </div>
            <p className="text-[10px] text-blue-400 mt-4 text-center font-bold uppercase tracking-[0.15em] opacity-80">
              {labels.tip}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
