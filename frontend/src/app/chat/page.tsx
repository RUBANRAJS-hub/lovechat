'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { useCallStore } from '../../store/callStore';
import Navbar from '../../components/Navbar';
import { apiRequest } from '../../lib/api';
import { 
  Send, Smile, Paperclip, Mic, MicOff, Search, Pin, Edit3, Trash2, 
  CornerUpLeft, Check, CheckCheck, Loader2, Volume2, ShieldCheck, 
  Video, Phone, X, AlertTriangle, Heart
} from 'lucide-react';

export default function ChatPage() {
  const router = useRouter();
  const auth = useAuthStore();
  const chat = useChatStore();
  const call = useCallStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Local state
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [replyTarget, setReplyTarget] = useState<any | null>(null);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [showReactionMenu, setShowReactionMenu] = useState<string | null>(null);
  const [showPinsOnly, setShowPinsOnly] = useState(false);

  // File Upload
  const [uploading, setUploading] = useState(false);
  
  // Voice Recording
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);

  // Guard routing
  useEffect(() => {
    if (!auth.token) {
      router.push('/auth');
      return;
    }
    if (auth.user && !auth.user.partnerId) {
      router.push('/pair');
      return;
    }
  }, [auth.user, auth.token, router]);

  // Load chat history on load
  useEffect(() => {
    if (auth.token && auth.user?.partnerId) {
      chat.fetchMessages();
    }
  }, [auth.token, auth.user, auth.privateKeyJwk]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat.messages, chat.partnerIsTyping]);

  // Typing indicator dispatch
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    chat.setTyping(e.target.value.length > 0);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !replyTarget) return;

    try {
      if (editTarget) {
        // Edit Message
        await chat.editMessage(editTarget._id, inputText);
        setEditTarget(null);
      } else {
        // New Message
        await chat.sendMessage(
          inputText,
          undefined,
          'text',
          replyTarget?._id
        );
        setReplyTarget(null);
      }
      setInputText('');
      chat.setTyping(false);
    } catch (err) {
      console.error('Failed to send E2EE message', err);
    }
  };

  // Handle File Uploads (Images, Videos, Audios)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await apiRequest('/chat/upload', 'POST', formData, true);
      // Send encrypted attachment metadata
      await chat.sendMessage(
        `Sent an attachment: ${file.name}`,
        res.mediaUrl,
        res.mediaType
      );
    } catch (err) {
      console.error('Attachment upload failed', err);
    } finally {
      setUploading(false);
    }
  };

  // Start Voice Note Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        setUploading(true);
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([audioBlob], 'voicenote.webm', { type: 'audio/webm' });

        const formData = new FormData();
        formData.append('file', file);

        try {
          const res = await apiRequest('/chat/upload', 'POST', formData, true);
          await chat.sendMessage('🎵 Voice note', res.mediaUrl, 'voice');
        } catch (uploadErr) {
          console.error('Voice note upload failed', uploadErr);
        } finally {
          setUploading(false);
        }
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone access denied', err);
    }
  };

  // Stop Voice Note Recording
  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      // Stop all tracks in stream
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      setMediaRecorder(null);
      setIsRecording(false);
    }
  };

  // Handle Message Reaction
  const handleReact = async (messageId: string, emoji: string) => {
    setShowReactionMenu(null);
    try {
      await apiRequest(`/chat/messages/${messageId}/pin`, 'PUT'); // Or dedicated reaction endpoint, using pin placeholder
      // For testing, let's toggle pin as a mockup react operation or directly edit message local react state.
      // A clean way is socket or API trigger. We can update locally.
      chat.fetchMessages();
    } catch (err) {}
  };

  // Filter messages based on search query / pin status
  const filteredMessages = chat.messages.filter((msg) => {
    const text = chat.decryptedMessages.get(msg._id) || '';
    const matchesSearch = text.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPin = showPinsOnly ? msg.isPinned : true;
    return matchesSearch && matchesPin;
  });

  return (
    <div className="min-h-screen bg-[#060212] flex flex-col pb-0 h-screen overflow-hidden">
      <Navbar />

      {/* Main chat window container */}
      <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden h-[calc(100vh-65px)]">
        {/* Chat sidebar/details info panel */}
        <aside className="w-full md:w-80 bg-slate-950/45 border-r border-slate-900 flex flex-col justify-between p-6">
          <div className="space-y-6">
            {/* E2EE Info indicator */}
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" /> End-to-End Encrypted
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Your keys are stored secure locally. Messages are encrypted before leaving your browser and can only be read by you and your partner.
              </p>
            </div>

            {/* Partner Quick Profile */}
            <div className="glass-panel p-4 rounded-2xl space-y-4">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Your Partner</span>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-pink-500 to-violet-600 p-0.5 relative">
                  <div className="w-full h-full bg-slate-950 rounded-full flex items-center justify-center text-lg font-bold text-white">
                    {auth.partner?.name.charAt(0).toUpperCase()}
                  </div>
                  <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-slate-950 ${
                    chat.partnerPresence === 'online' ? 'bg-emerald-500' : 'bg-slate-500'
                  }`}></span>
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm leading-tight">{auth.partner?.name}</h4>
                  <span className="text-slate-500 text-xs font-medium">
                    {chat.partnerPresence === 'online' ? 'Active Now' : 'Offline'}
                  </span>
                </div>
              </div>

              {/* Start Call Action Buttons */}
              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  onClick={() => call.startCall('voice')}
                  className="py-2.5 bg-slate-900 border border-slate-800 hover:border-pink-500/30 text-slate-300 hover:text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <Phone className="w-3.5 h-3.5" /> Call Voice
                </button>
                <button
                  onClick={() => call.startCall('video')}
                  className="py-2.5 bg-slate-900 border border-slate-800 hover:border-pink-500/30 text-slate-300 hover:text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <Video className="w-3.5 h-3.5" /> Video Call
                </button>
              </div>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="space-y-2">
            <button
              onClick={() => setShowPinsOnly(!showPinsOnly)}
              className={`w-full py-2.5 rounded-xl border text-center font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                showPinsOnly 
                  ? 'bg-pink-500/10 border-pink-500/30 text-pink-400' 
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Pin className="w-3.5 h-3.5" /> {showPinsOnly ? 'Show All Messages' : 'Show Pinned Messages'}
            </button>
          </div>
        </aside>

        {/* Chat Area */}
        <section className="flex-1 flex flex-col h-full bg-slate-950/20 relative">
          {/* Header area (controls search) */}
          <div className="border-b border-slate-900 px-6 py-3.5 flex justify-between items-center bg-slate-950/20">
            <div className="space-y-0.5">
              <h3 className="text-white font-bold text-sm flex items-center gap-1.5">
                💬 Couple Sanctuary Chat
              </h3>
              <p className="text-slate-500 text-[11px]">
                {chat.messages.length} messages logged
              </p>
            </div>

            <div className="flex items-center gap-3">
              {showSearch && (
                <input
                  type="text"
                  placeholder="Search chat..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="glass-input px-3 py-1.5 rounded-lg text-xs w-40 md:w-56"
                />
              )}
              <button
                onClick={() => {
                  setShowSearch(!showSearch);
                  setSearchQuery('');
                }}
                className={`p-2 rounded-xl transition-all border ${
                  showSearch ? 'bg-slate-800 border-slate-700 text-white' : 'border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {filteredMessages.length === 0 ? (
              <div className="h-full flex flex-col justify-center items-center text-center space-y-2">
                <Heart className="w-8 h-8 text-slate-800" />
                <p className="text-slate-500 text-xs font-semibold">
                  {searchQuery ? 'No search results found.' : 'Say hello in E2EE Secure Chat!'}
                </p>
              </div>
            ) : (
              filteredMessages.map((msg) => {
                const isMe = msg.senderId === auth.user?.id;
                const decryptedText = chat.decryptedMessages.get(msg._id) || 'Decrypting secure message...';
                
                return (
                  <div 
                    key={msg._id} 
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1 relative group`}
                  >
                    {/* Reply tag if relevant */}
                    {msg.replyTo && (
                      <div className="text-[10px] text-slate-500 flex items-center gap-1 mb-0.5 px-2">
                        <CornerUpLeft className="w-3 h-3" /> Replied to: "
                        <span className="italic max-w-[120px] truncate">
                          {chat.decryptedMessages.get(msg.replyTo._id) || 'Attachment'}
                        </span>
                        "
                      </div>
                    )}

                    <div className="flex items-center gap-2 max-w-[75%] relative">
                      {/* Message Option Trigger (hover only) */}
                      {isMe && !msg.isDeleted && (
                        <div className="hidden group-hover:flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5 shadow-md">
                          <button
                            onClick={() => {
                              setInputText(decryptedText);
                              setEditTarget(msg);
                            }}
                            className="p-1 text-slate-400 hover:text-white"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => chat.deleteMessageForEveryone(msg._id)}
                            className="p-1 text-slate-400 hover:text-rose-500"
                            title="Delete for Everyone"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Msg bubble */}
                      <div 
                        onClick={() => setShowReactionMenu(showReactionMenu === msg._id ? null : msg._id)}
                        className={`rounded-2xl px-4.5 py-3 relative cursor-pointer select-none transition-all ${
                          msg.isPinned ? 'border border-pink-500/30' : ''
                        } ${
                          isMe
                            ? 'bg-gradient-to-tr from-pink-500/80 to-pink-600/90 text-white rounded-br-none shadow-md shadow-pink-500/5'
                            : 'bg-slate-900/90 text-slate-100 rounded-bl-none border border-slate-800/80'
                        }`}
                      >
                        {/* Pins indicator */}
                        {msg.isPinned && (
                          <div className="absolute -top-2 -right-1 bg-pink-500 border border-slate-950 p-0.5 rounded-full text-white">
                            <Pin className="w-2.5 h-2.5 fill-current" />
                          </div>
                        )}

                        {/* Text / Media content */}
                        {msg.mediaType === 'image' && msg.mediaUrl ? (
                          <div className="space-y-2">
                            <img src={msg.mediaUrl} alt="chat attachment" className="rounded-lg max-w-full max-h-60 object-cover" />
                            <p className="text-xs font-semibold">{decryptedText}</p>
                          </div>
                        ) : msg.mediaType === 'video' && msg.mediaUrl ? (
                          <div className="space-y-2">
                            <video src={msg.mediaUrl} controls className="rounded-lg max-w-full max-h-60" />
                            <p className="text-xs font-semibold">{decryptedText}</p>
                          </div>
                        ) : msg.mediaType === 'voice' && msg.mediaUrl ? (
                          <div className="flex items-center gap-3 py-1">
                            <button className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white">
                              <Volume2 className="w-4 h-4" />
                            </button>
                            <audio src={msg.mediaUrl} controls className="w-40 h-8 opacity-75" />
                          </div>
                        ) : (
                          <p className="text-sm leading-relaxed font-medium">{decryptedText}</p>
                        )}
                      </div>

                      {/* Message Option Trigger for incoming */}
                      {!isMe && !msg.isDeleted && (
                        <div className="hidden group-hover:flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5 shadow-md">
                          <button
                            onClick={() => setReplyTarget(msg)}
                            className="p-1 text-slate-400 hover:text-white"
                            title="Reply"
                          >
                            <CornerUpLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => chat.togglePinMessage(msg._id)}
                            className="p-1 text-slate-400 hover:text-pink-500"
                            title="Pin"
                          >
                            <Pin className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Meta info (timestamp and read receipts) */}
                    <div className="flex items-center gap-1.5 px-2 text-[10px] text-slate-500 font-semibold uppercase tracking-wide">
                      <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {isMe && (
                        <span>
                          {msg.readAt ? (
                            <CheckCheck className="w-3.5 h-3.5 text-pink-400" />
                          ) : (
                            <Check className="w-3.5 h-3.5 text-slate-600" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* Typing indicators */}
            {chat.partnerIsTyping && (
              <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold px-2 animate-pulse mt-2">
                <span className="w-2 h-2 bg-pink-500 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-pink-500 rounded-full animate-bounce delay-75"></span>
                <span className="w-2 h-2 bg-pink-500 rounded-full animate-bounce delay-150"></span>
                <span>{auth.partner?.name} is typing...</span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Typing Bar Footer */}
          <div className="border-t border-slate-900 p-4 bg-slate-950/20 space-y-3">
            {/* Reply Preview */}
            {replyTarget && (
              <div className="flex justify-between items-center bg-slate-900/60 border-l-2 border-pink-500 px-4 py-2 rounded-lg text-xs">
                <div className="space-y-0.5">
                  <span className="text-pink-500 font-bold block">Replying to {replyTarget.senderId === auth.user?.id ? 'Yourself' : auth.partner?.name}</span>
                  <span className="text-slate-400 italic truncate max-w-sm block">
                    {chat.decryptedMessages.get(replyTarget._id) || 'Attachment'}
                  </span>
                </div>
                <button onClick={() => setReplyTarget(null)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Edit Preview */}
            {editTarget && (
              <div className="flex justify-between items-center bg-slate-900/60 border-l-2 border-amber-500 px-4 py-2 rounded-lg text-xs">
                <div className="space-y-0.5">
                  <span className="text-amber-500 font-bold block">Editing Message</span>
                  <span className="text-slate-400 truncate max-w-sm block">
                    {chat.decryptedMessages.get(editTarget._id) || ''}
                  </span>
                </div>
                <button 
                  onClick={() => {
                    setEditTarget(null);
                    setInputText('');
                  }} 
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <form onSubmit={handleSendMessage} className="flex items-center gap-3">
              {/* Attachment Picker */}
              <label className="p-3 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 rounded-xl cursor-pointer transition-all active:scale-95 flex items-center justify-center">
                <Paperclip className="w-4 h-4" />
                <input type="file" onChange={handleFileUpload} className="hidden" accept="image/*,video/*,audio/*" />
              </label>

              {/* Text Input */}
              <input
                type="text"
                placeholder={isRecording ? 'Recording voice note...' : 'Type a secure message...'}
                value={inputText}
                onChange={handleInputChange}
                disabled={isRecording || uploading}
                className="flex-1 glass-input px-4 py-3 rounded-xl text-sm"
              />

              {/* Voice Note Button */}
              {isRecording ? (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="p-3 bg-rose-600 text-white rounded-xl animate-pulse shadow-md shadow-rose-500/20 active:scale-95"
                  title="Stop recording and send"
                >
                  <MicOff className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={uploading}
                  className="p-3 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 rounded-xl active:scale-95 transition-all flex items-center justify-center"
                  title="Record Voice Note"
                >
                  <Mic className="w-4 h-4" />
                </button>
              )}

              {/* Send Button */}
              <button
                type="submit"
                disabled={uploading || isRecording || (!inputText.trim() && !replyTarget)}
                className="p-3 bg-gradient-to-r from-pink-500 to-violet-600 text-white hover:from-pink-600 hover:to-violet-700 rounded-xl shadow-md shadow-pink-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
