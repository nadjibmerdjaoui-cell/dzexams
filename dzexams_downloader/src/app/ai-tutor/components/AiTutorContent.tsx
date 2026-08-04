'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '@/lib/hooks/useChat';
import ReactMarkdown from 'react-markdown';
import toast from 'react-hot-toast';
import {
  Bot,
  Send,
  Sparkles,
  BookOpen,
  HelpCircle,
  RefreshCw,
  User,
  Lightbulb,
  ClipboardList,
  MessageSquare,
  ChevronDown,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

type Mode = 'chat' | 'explain' | 'quiz' | 'revision';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

const SUBJECTS = [
  { value: 'math', label: 'رياضيات / Mathématiques' },
  { value: 'physics', label: 'فيزياء / Physique' },
  { value: 'chemistry', label: 'كيمياء / Chimie' },
  { value: 'biology', label: 'علوم طبيعية / Sciences Naturelles' },
  { value: 'history', label: 'تاريخ / Histoire' },
  { value: 'geography', label: 'جغرافيا / Géographie' },
  { value: 'arabic', label: 'لغة عربية / Langue Arabe' },
  { value: 'french', label: 'لغة فرنسية / Français' },
  { value: 'philosophy', label: 'فلسفة / Philosophie' },
  { value: 'economics', label: 'اقتصاد / Économie' },
];

const LEVELS = [
  { value: '1as', label: '1ère AS' },
  { value: '2as', label: '2ème AS' },
  { value: '3as', label: '3ème AS / BAC' },
];

const SYSTEM_PROMPT = (subject: string, level: string, mode: Mode) => {
  const subjectLabel = SUBJECTS.find((s) => s.value === subject)?.label || subject;
  const levelLabel = LEVELS.find((l) => l.value === level)?.label || level;
  const base = `You are an expert Algerian high school tutor specializing in ${subjectLabel} for ${levelLabel} students. 
You teach in both Arabic and French, matching the student's language. 
You follow the Algerian national curriculum (programme national).
Always be encouraging, clear, and pedagogical.`;

  if (mode === 'explain') {
    return `${base}
When asked to explain a concept, provide:
1. A clear definition
2. Key points and formulas (if applicable)
3. A worked example
4. A memory tip
Format your response with clear sections using markdown.`;
  }
  if (mode === 'quiz') {
    return `${base}
Generate quiz questions in JSON format ONLY. No extra text before or after.
Format: {"questions": [{"question": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "answer": "A", "explanation": "..."}]}
Generate exactly 5 multiple-choice questions appropriate for ${levelLabel} level.`;
  }
  if (mode === 'revision') {
    return `${base}
Create a structured revision summary with:
1. Key concepts (النقاط الأساسية)
2. Important formulas or rules
3. Common exam mistakes to avoid
4. 3 practice questions with answers
Format using markdown with clear headings.`;
  }
  return `${base}
Answer questions clearly and concisely. Use examples from the Algerian curriculum context.
If the student writes in Arabic, respond in Arabic. If in French, respond in French.`;
};

export default function AiTutorContent() {
  const [mode, setMode] = useState<Mode>('chat');
  const [subject, setSubject] = useState('math');
  const [level, setLevel] = useState('3as');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [quizData, setQuizData] = useState<QuizQuestion[] | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizTopic, setQuizTopic] = useState('');
  const [revisionTopic, setRevisionTopic] = useState('');
  const [explainTopic, setExplainTopic] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { response, isLoading, error, sendMessage } = useChat('OPEN_AI', 'gpt-4o', true);

  useEffect(() => {
    if (error) toast.error(error.message);
  }, [error]);

  useEffect(() => {
    if (response && !isLoading) {
      if (mode === 'quiz') {
        try {
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.questions) {
              setQuizData(parsed.questions);
              setSelectedAnswers({});
              setQuizSubmitted(false);
            }
          }
        } catch {
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === 'assistant') return prev;
            return [...prev, { role: 'assistant', content: response }];
          });
        }
      } else {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant' && last.content === response) return prev;
          const withoutLast =
            last?.role === 'assistant' ? prev.slice(0, -1) : prev;
          return [...withoutLast, { role: 'assistant', content: response }];
        });
      }
    }
  }, [response, isLoading, mode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, quizData]);

  const handleSendChat = () => {
    if (!input.trim() || isLoading) return;
    const userMsg: Message = { role: 'user', content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    sendMessage(
      [
        { role: 'system', content: SYSTEM_PROMPT(subject, level, 'chat') },
        ...newMessages.map((m) => ({ role: m.role, content: m.content })),
      ],
      { max_completion_tokens: 1024 }
    );
  };

  const handleExplain = () => {
    if (!explainTopic.trim() || isLoading) return;
    setMessages([]);
    sendMessage(
      [
        { role: 'system', content: SYSTEM_PROMPT(subject, level, 'explain') },
        { role: 'user', content: `Explain this concept: ${explainTopic}` },
      ],
      { max_completion_tokens: 1500 }
    );
  };

  const handleGenerateQuiz = () => {
    if (!quizTopic.trim() || isLoading) return;
    setQuizData(null);
    setSelectedAnswers({});
    setQuizSubmitted(false);
    sendMessage(
      [
        { role: 'system', content: SYSTEM_PROMPT(subject, level, 'quiz') },
        {
          role: 'user',
          content: `Generate 5 multiple choice questions about: ${quizTopic}`,
        },
      ],
      { max_completion_tokens: 2000 }
    );
  };

  const handleRevision = () => {
    if (!revisionTopic.trim() || isLoading) return;
    setMessages([]);
    sendMessage(
      [
        { role: 'system', content: SYSTEM_PROMPT(subject, level, 'revision') },
        {
          role: 'user',
          content: `Create a revision summary for: ${revisionTopic}`,
        },
      ],
      { max_completion_tokens: 2000 }
    );
  };

  const handleQuizSubmit = () => {
    if (Object.keys(selectedAnswers).length < (quizData?.length || 0)) {
      toast.error('Please answer all questions before submitting.');
      return;
    }
    setQuizSubmitted(true);
  };

  const getScore = () => {
    if (!quizData) return 0;
    return quizData.filter((q, i) => selectedAnswers[i] === q.answer).length;
  };

  const resetMode = () => {
    setMessages([]);
    setQuizData(null);
    setSelectedAnswers({});
    setQuizSubmitted(false);
    setInput('');
  };

  const modes = [
    { id: 'chat' as Mode, label: 'مساعد / Chat', icon: <MessageSquare size={16} /> },
    { id: 'explain' as Mode, label: 'شرح / Explain', icon: <Lightbulb size={16} /> },
    { id: 'quiz' as Mode, label: 'اختبار / Quiz', icon: <ClipboardList size={16} /> },
    { id: 'revision' as Mode, label: 'مراجعة / Revision', icon: <BookOpen size={16} /> },
  ];

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-card">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Bot size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-foreground">AI Tutor — مدرّس ذكي</h1>
          <p className="text-xs text-muted-foreground">
            Powered by OpenAI · Algerian Curriculum
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {/* Subject */}
          <div className="relative">
            <select
              value={subject}
              onChange={(e) => { setSubject(e.target.value); resetMode(); }}
              className="appearance-none bg-muted border border-border text-foreground text-xs rounded-lg px-3 py-2 pr-7 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              {SUBJECTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
          {/* Level */}
          <div className="relative">
            <select
              value={level}
              onChange={(e) => { setLevel(e.target.value); resetMode(); }}
              className="appearance-none bg-muted border border-border text-foreground text-xs rounded-lg px-3 py-2 pr-7 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              {LEVELS.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex gap-1 px-6 py-3 border-b border-border bg-card/50">
        {modes.map((m) => (
          <button
            key={m.id}
            onClick={() => { setMode(m.id); resetMode(); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mode === m.id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {m.icon}
            {m.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {/* ── CHAT MODE ── */}
        {mode === 'chat' && (
          <div className="flex flex-col h-full">
            <div className="flex-1 px-6 py-4 space-y-4 overflow-y-auto scrollbar-thin">
              {messages.length === 0 && !isLoading && (
                <div className="flex flex-col items-center justify-center h-full text-center py-16">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                    <Sparkles size={28} className="text-primary" />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground mb-1">
                    مرحباً! كيف يمكنني مساعدتك؟
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Ask me anything about your subject. I speak Arabic and French.
                  </p>
                  <div className="mt-6 grid grid-cols-2 gap-2 w-full max-w-md">
                    {[
                      'اشرح لي قانون نيوتن الثاني',
                      'Explique-moi les intégrales',
                      'ما هي أسباب الثورة الجزائرية؟',
                      'Comment résoudre une équation du 2nd degré?',
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => setInput(suggestion)}
                        className="text-xs text-left px-3 py-2 rounded-lg border border-border bg-muted hover:bg-muted/80 hover:border-primary/40 text-muted-foreground hover:text-foreground transition-all"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                      <Bot size={14} className="text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm ${
                      msg.role === 'user' ?'bg-primary text-primary-foreground rounded-tr-sm' :'bg-card border border-border text-foreground rounded-tl-sm'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm prose-invert max-w-none text-foreground [&_p]:text-foreground [&_li]:text-foreground [&_strong]:text-foreground [&_code]:text-primary [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-1">
                      <User size={14} className="text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                    <Bot size={14} className="text-primary" />
                  </div>
                  <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3">
                    {response ? (
                      <div className="prose prose-sm max-w-none text-foreground [&_p]:text-foreground [&_li]:text-foreground [&_strong]:text-foreground [&_code]:text-primary [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded">
                        <ReactMarkdown>{response}</ReactMarkdown>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground text-xs">
                        <Loader2 size={14} className="animate-spin" />
                        <span>Thinking...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            {/* Chat Input */}
            <div className="px-6 py-4 border-t border-border bg-card/50">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendChat()}
                  placeholder="اكتب سؤالك هنا... / Posez votre question..."
                  disabled={isLoading}
                  className="flex-1 bg-muted border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                />
                <button
                  onClick={handleSendChat}
                  disabled={isLoading || !input.trim()}
                  className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── EXPLAIN MODE ── */}
        {mode === 'explain' && (
          <div className="px-6 py-6 space-y-6">
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb size={18} className="text-yellow-400" />
                <h2 className="text-sm font-semibold text-foreground">شرح مفصّل / Explication Détaillée</h2>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Enter a concept or topic and get a detailed explanation with examples.
              </p>
              <div className="flex gap-2">
                <input
                  value={explainTopic}
                  onChange={(e) => setExplainTopic(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleExplain()}
                  placeholder="e.g. التفاضل والتكامل / Les dérivées / Newton's Laws"
                  disabled={isLoading}
                  className="flex-1 bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                />
                <button
                  onClick={handleExplain}
                  disabled={isLoading || !explainTopic.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  Explain
                </button>
              </div>
            </div>
            {(messages.length > 0 || isLoading) && (
              <div className="bg-card border border-border rounded-xl p-5">
                {isLoading && !response ? (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Loader2 size={16} className="animate-spin" />
                    <span>Generating explanation...</span>
                  </div>
                ) : (
                  <div className="prose prose-sm max-w-none text-foreground [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_p]:text-foreground [&_li]:text-foreground [&_strong]:text-foreground [&_code]:text-primary [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded [&_blockquote]:border-primary [&_blockquote]:text-muted-foreground">
                    <ReactMarkdown>{isLoading ? response : messages[messages.length - 1]?.content || ''}</ReactMarkdown>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── QUIZ MODE ── */}
        {mode === 'quiz' && (
          <div className="px-6 py-6 space-y-6">
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <ClipboardList size={18} className="text-blue-400" />
                <h2 className="text-sm font-semibold text-foreground">اختبار تفاعلي / Quiz Interactif</h2>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Generate 5 multiple-choice questions on any topic from your curriculum.
              </p>
              <div className="flex gap-2">
                <input
                  value={quizTopic}
                  onChange={(e) => setQuizTopic(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerateQuiz()}
                  placeholder="e.g. الدوال الأسية / Les fonctions / Thermodynamique"
                  disabled={isLoading}
                  className="flex-1 bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                />
                <button
                  onClick={handleGenerateQuiz}
                  disabled={isLoading || !quizTopic.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isLoading ? <Loader2 size={14} className="animate-spin" /> : <HelpCircle size={14} />}
                  Generate
                </button>
              </div>
            </div>

            {isLoading && !quizData && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm px-1">
                <Loader2 size={16} className="animate-spin" />
                <span>Generating quiz questions...</span>
              </div>
            )}

            {quizData && (
              <div className="space-y-4">
                {quizSubmitted && (
                  <div className={`flex items-center gap-3 p-4 rounded-xl border ${
                    getScore() >= 4 ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                    getScore() >= 3 ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400': 'bg-red-500/10 border-red-500/30 text-red-400'
                  }`}>
                    <Sparkles size={20} />
                    <div>
                      <p className="font-semibold text-sm">
                        Score: {getScore()} / {quizData.length}
                      </p>
                      <p className="text-xs opacity-80">
                        {getScore() >= 4 ? 'Excellent! ممتاز 🎉' : getScore() >= 3 ? 'Good job! جيد 👍' : 'Keep practicing! واصل التدريب 💪'}
                      </p>
                    </div>
                    <button
                      onClick={() => { setQuizData(null); setSelectedAnswers({}); setQuizSubmitted(false); }}
                      className="ml-auto flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-all"
                    >
                      <RefreshCw size={12} />
                      New Quiz
                    </button>
                  </div>
                )}

                {quizData.map((q, qi) => (
                  <div key={qi} className="bg-card border border-border rounded-xl p-5">
                    <p className="text-sm font-medium text-foreground mb-3">
                      <span className="text-primary font-semibold mr-2">Q{qi + 1}.</span>
                      {q.question}
                    </p>
                    <div className="space-y-2">
                      {q.options.map((opt) => {
                        const letter = opt.charAt(0);
                        const isSelected = selectedAnswers[qi] === letter;
                        const isCorrect = letter === q.answer;
                        let optClass = 'border-border bg-muted/50 text-muted-foreground hover:border-primary/40 hover:text-foreground';
                        if (quizSubmitted) {
                          if (isCorrect) optClass = 'border-green-500/50 bg-green-500/10 text-green-400';
                          else if (isSelected && !isCorrect) optClass = 'border-red-500/50 bg-red-500/10 text-red-400';
                          else optClass = 'border-border bg-muted/30 text-muted-foreground opacity-60';
                        } else if (isSelected) {
                          optClass = 'border-primary bg-primary/10 text-primary';
                        }
                        return (
                          <button
                            key={opt}
                            onClick={() => !quizSubmitted && setSelectedAnswers((prev) => ({ ...prev, [qi]: letter }))}
                            disabled={quizSubmitted}
                            className={`w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-all ${optClass} ${!quizSubmitted ? 'cursor-pointer' : 'cursor-default'}`}
                          >
                            {quizSubmitted && isCorrect && <CheckCircle2 size={14} className="shrink-0" />}
                            {quizSubmitted && isSelected && !isCorrect && <XCircle size={14} className="shrink-0" />}
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                    {quizSubmitted && (
                      <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border">
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">Explanation: </span>
                          {q.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                ))}

                {!quizSubmitted && (
                  <button
                    onClick={handleQuizSubmit}
                    className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all"
                  >
                    Submit Answers — تسليم الإجابات
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── REVISION MODE ── */}
        {mode === 'revision' && (
          <div className="px-6 py-6 space-y-6">
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen size={18} className="text-green-400" />
                <h2 className="text-sm font-semibold text-foreground">ملخص المراجعة / Fiche de Révision</h2>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Get a structured revision sheet with key concepts, formulas, and practice questions.
              </p>
              <div className="flex gap-2">
                <input
                  value={revisionTopic}
                  onChange={(e) => setRevisionTopic(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRevision()}
                  placeholder="e.g. الميكانيك / Mécanique / الثورة الجزائرية"
                  disabled={isLoading}
                  className="flex-1 bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                />
                <button
                  onClick={handleRevision}
                  disabled={isLoading || !revisionTopic.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isLoading ? <Loader2 size={14} className="animate-spin" /> : <BookOpen size={14} />}
                  Generate
                </button>
              </div>
            </div>
            {(messages.length > 0 || isLoading) && (
              <div className="bg-card border border-border rounded-xl p-5">
                {isLoading && !response ? (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Loader2 size={16} className="animate-spin" />
                    <span>Creating revision sheet...</span>
                  </div>
                ) : (
                  <div className="prose prose-sm max-w-none text-foreground [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_p]:text-foreground [&_li]:text-foreground [&_strong]:text-foreground [&_code]:text-primary [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded [&_blockquote]:border-primary [&_blockquote]:text-muted-foreground">
                    <ReactMarkdown>{isLoading ? response : messages[messages.length - 1]?.content || ''}</ReactMarkdown>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
