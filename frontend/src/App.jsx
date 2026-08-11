import { useState, useRef, useEffect } from 'react';
import { Copy, Edit2, Check, Plus, Trash2, Search, Menu, X, MessageSquare, Edit3, MoreHorizontal, Mic, Send, StopCircle, Camera, Paperclip } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const App = () => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I am your AI flight agent. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiModel, setAiModel] = useState('gemini');
  const [personality, setPersonality] = useState('professional');
  const [isListening, setIsListening] = useState(false);
  
  // Seat Selection States
  const [showSeatMap, setShowSeatMap] = useState(false);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [seatCabinClass, setSeatCabinClass] = useState('economy');
  const [maxSeatSelection, setMaxSeatSelection] = useState(1);
  const [currentSeatSelection, setCurrentSeatSelection] = useState(null);
  const [seatLockStatus, setSeatLockStatus] = useState('');
  const [occupiedSeats, setOccupiedSeats] = useState([]);
  const [seatMapLoading, setSeatMapLoading] = useState(false);

  // Vision / File Scanner States
  const [selectedImage, setSelectedImage] = useState(null);
  const fileInputRef = useRef(null);

  const [editingIndex, setEditingIndex] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);

  // Chats Session State
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);

  // User Authentication & Bookings State
  const [user, setUser] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showBookingsModal, setShowBookingsModal] = useState(false);
  const [userBookings, setUserBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const shouldOpenSeatMap = (messageContent = '') => {
    const content = messageContent.toLowerCase();
    return (
      content.includes('select seat') ||
      content.includes('select seats') ||
      content.includes('choose seat') ||
      content.includes('choose seats') ||
      content.includes('seat selection') ||
      content.includes('locked a seat') ||
      content.includes('seats locked')
    );
  };

  // Fetch real occupied seats from backend
  const fetchSeatAvailability = async (flightId, cabinClass) => {
    if (!flightId) {
      setOccupiedSeats([]);
      return;
    }
    try {
      setSeatMapLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API}/api/bookings/flights/${flightId}/seats/availability?cabinClass=${cabinClass}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      const data = await response.json();
      if (data.success) {
        setOccupiedSeats(data.unavailableSeats || []);
      } else {
        setOccupiedSeats([]);
      }
    } catch (error) {
      console.error('Error fetching seat availability:', error);
      setOccupiedSeats([]);
    } finally {
      setSeatMapLoading(false);
    }
  };

  // Fetch seat availability when seat map opens or cabin class changes
  useEffect(() => {
    if (showSeatMap && currentSeatSelection?.flightId) {
      fetchSeatAvailability(currentSeatSelection.flightId, seatCabinClass);
    }
  }, [showSeatMap, seatCabinClass, currentSeatSelection?.flightId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    const handleClickOutside = () => {
      setOpenMenuId(null);
      setShowUserMenu(false);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    // Load logged-in user details
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }

    fetchChatsList();

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success') {
      const bookingId = urlParams.get('booking_id');
      const chatId = urlParams.get('chat_id');
      // Dodo appends payment_id to the return_url — capture it so we can save it to DB
      const paymentId = urlParams.get('payment_id');

      if (bookingId) {
          fetch(`${API}/api/webhooks/confirm/${bookingId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentId })
          }).catch(console.error);
      }

      const successMsg = {
        role: 'assistant',
        content: `**Payment Successful!** Your booking (ID: ${bookingId || 'N/A'}) has been confirmed. A confirmation email with your tickets and PNR has been sent to your inbox. ✈️`
      };

      if (chatId) {
        loadChat(chatId, successMsg);
      } else {
        setMessages(prev => [...prev, successMsg]);
      }
      
      // Cleanup URL without refreshing
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const handleResize = () => {
      if (window.innerWidth >= 1024) setIsSidebarOpen(true);
      else setIsSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchChatsList = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/chats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.reload();
        return;
      }
      const data = await res.json();
      if (data.success) setChats(data.chats);
    } catch (err) {
      console.error(err);
    }
  };

  const loadChat = async (id, extraMessage = null) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/chats/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setMessages(extraMessage ? [...data.chat.messages, extraMessage] : data.chat.messages);
        setActiveChatId(id);
        if (window.innerWidth < 1024) setIsSidebarOpen(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const startNewChat = () => {
    setMessages([{ role: 'assistant', content: 'Hello! I am your AI flight agent. How can I help you today?' }]);
    setActiveChatId(null);
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  const deleteChat = async (e, id) => {
    e.stopPropagation();
    try {
      if (!window.confirm("Delete this chat?")) return;
      const token = localStorage.getItem('token');
      await fetch(`${API}/api/chats/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (activeChatId === id) startNewChat();
      fetchChatsList();
    } catch (err) {
      console.error(err);
    }
  };

  const renameChat = async (e, id, oldTitle) => {
    e.stopPropagation();
    const newTitle = prompt("Enter new chat title:", oldTitle);
    if (newTitle && newTitle.trim() !== oldTitle) {
      try {
        const token = localStorage.getItem('token');
        await fetch(`${API}/api/chats/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ title: newTitle.trim() })
        });
        fetchChatsList();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const fetchUserBookings = async () => {
    setShowBookingsModal(true);
    setLoadingBookings(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/users/bookings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setUserBookings(data.bookings);
      }
    } catch (err) {
      console.error('Error fetching bookings:', err);
    } finally {
      setLoadingBookings(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
  };

  const getGroupedChats = () => {
    const groups = { 'Today': [], 'Yesterday': [], 'Previous 7 Days': [], 'Older': [] };
    const now = new Date();

    chats.filter(c => {
      if (!searchQuery) return true;
      const lowerQuery = searchQuery.toLowerCase();
      if (c.title && c.title.toLowerCase().includes(lowerQuery)) return true;
      if (c.messages && c.messages.some(m => m.content && String(m.content).toLowerCase().includes(lowerQuery))) return true;
      return false;
    }).forEach(chat => {
      const updated = new Date(chat.updatedAt);
      const diffTime = now.getTime() - updated.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      const isToday = now.toDateString() === updated.toDateString();
      const isYesterday = new Date(now.setDate(now.getDate() - 1)).toDateString() === updated.toDateString();
      now.setDate(now.getDate() + 1); // reset back!

      if (isToday) groups['Today'].push(chat);
      else if (isYesterday) groups['Yesterday'].push(chat);
      else if (diffDays <= 7) groups['Previous 7 Days'].push(chat);
      else groups['Older'].push(chat);
    });
    return groups;
  };

  // 🎤 Setup Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.log("Speech Recognition not supported");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };
    recognitionRef.current = recognition;
  }, []);

  const startListening = () => {
    if (recognitionRef.current) recognitionRef.current.start();
  };

  // 🔊 Text To Speech
  const speakText = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    
    // Remove markdown formatting before speaking
    const cleanText = text.replace(/[*#_\`\[\]()\-]/g, '');
    const speech = new SpeechSynthesisUtterance(cleanText);
    speech.lang = "en-US";

    if (personality === 'cheerful') {
      speech.pitch = 1.3;
      speech.rate = 1.1;
    } else if (personality === 'chill') {
      speech.pitch = 0.8;
      speech.rate = 0.85;
    } else if (personality === 'pirate') {
      speech.pitch = 0.85;
      speech.rate = 0.95;
    } else {
      speech.pitch = 1.0;
      speech.rate = 1.0;
    }

    window.speechSynthesis.speak(speech);
  };

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const startEditing = (index, content) => {
    setEditingIndex(index);
    setEditValue(content);
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setEditValue('');
  };

  const submitEdit = (index) => {
    if (!editValue.trim() || isLoading) return;
    const newMessages = messages.slice(0, index);
    const userMessage = { role: 'user', content: editValue };
    const updatedMessages = [...newMessages, userMessage];

    setMessages(updatedMessages);
    setEditingIndex(null);
    setEditValue('');
    setIsLoading(true);

    fetchChat(updatedMessages);
  };

  const fetchChat = async (messagesArray) => {
    try {
      const lastMsg = messagesArray[messagesArray.length - 1];
      const payload = {
        messages: messagesArray.slice(1).map(m => ({ role: m.role, content: m.content })),
        aiModel,
        personality,
        chatId: activeChatId
      };
      if (lastMsg && lastMsg.image) {
        payload.image = lastMsg.image;
      }

      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.reload();
        return;
      }

      const data = await response.json();

      if (data.success && data.message) {
        setMessages([...messagesArray, data.message]);
        if (data.seatSelection) {
          setCurrentSeatSelection(data.seatSelection);
          setSeatCabinClass(data.seatSelection.cabinClass || 'economy');
          setMaxSeatSelection(Number(data.seatSelection.count) || 1);
          setSelectedSeats([]);
          setSeatLockStatus('');
          setShowSeatMap(true);
        } else if (shouldOpenSeatMap(data.message.content)) {
          setShowSeatMap(true);
        }
        speakText(data.message.content); // 🔊 AI speaks response
        if (data.chatId && data.chatId !== activeChatId) {
          setActiveChatId(data.chatId);
          fetchChatsList();
        }
      } else {
        setMessages([
          ...messagesArray,
          { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }
        ]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages([
        ...messagesArray,
        { role: 'assistant', content: 'Network error. Make sure the backend server (localhost:5000) is running.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const userMessage = { 
      role: 'user', 
      content: input.trim() ? input : 'Please scan this passport/ID and extract my details.',
      image: selectedImage 
    };
    const newMessages = [...messages, userMessage];

    setMessages(newMessages);
    setInput('');
    setSelectedImage(null);
    setIsLoading(true);

    fetchChat(newMessages);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const confirmSelectedSeats = async () => {
    if (selectedSeats.length === 0) return;

    if (!currentSeatSelection?.flightId) {
      setInput(`I would like to select seats: ${selectedSeats.join(', ')}`);
      setShowSeatMap(false);
      return;
    }

    try {
      setSeatLockStatus('Locking selected seats...');
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/api/bookings/flights/${currentSeatSelection.flightId}/seats/lock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          cabinClass: seatCabinClass,
          seats: selectedSeats,
          replacesLockId: currentSeatSelection.lockId
        })
      });

      const data = await response.json();
      if (!data.success) {
        setSeatLockStatus(data.message || 'Could not lock selected seats.');
        return;
      }

      const seatMessage = {
        role: 'user',
        content: `I selected seats ${data.seats.join(', ')}. Use seat lock ID ${data.lockId} and seats ${data.seats.join(', ')} for the booking.`
      };
      const newMessages = [...messages, seatMessage];

      setMessages(newMessages);
      setShowSeatMap(false);
      setCurrentSeatSelection({
        ...currentSeatSelection,
        lockId: data.lockId,
        seats: data.seats,
        expiresAt: data.expiresAt
      });
      setSeatLockStatus('');
      setIsLoading(true);
      fetchChat(newMessages);
    } catch (error) {
      setSeatLockStatus(error.message || 'Could not lock selected seats.');
    }
  };

  const groupedChats = getGroupedChats();

  return (
    <div className="flex h-screen bg-[#f0f8ff] font-sans  overflow-hidden text-[#000080] relative selection:bg-[#87CEEB]/30">
      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && window.innerWidth < 1024 && (
        <div className="fixed inset-0 bg-[#87CEEB]/30 z-40 transition-opacity" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`fixed lg:static inset-y-0 left-0 z-50 w-[260px] bg-[#0a192f] border-r border-[#0a192f] text-white flex flex-col transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Sidebar Header */}
        <div className="p-3 flex flex-col gap-3">
          <button onClick={startNewChat} className="flex items-center justify-between bg-white hover:bg-gray-100 text-[#0a192f] font-medium py-2 px-3 rounded-lg transition border border-white/50 shadow-sm w-full group">
            <span className="flex items-center gap-2"><Plus size={16} /> New Chat</span>
            <Edit3 size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>

          {/* Chats List Search placed directly at the top of the chat area for better UX */}
          <div className="relative mt-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Chats"
              className="w-full bg-[#0a192f] border border-white/30 text-sm text-white rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-white focus:shadow-sm placeholder-white/50 transition"
            />
          </div>
        </div>

        {/* Chats List */}
        <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-3">
          <div className="px-2 pt-2">
            <h2 className="text-xs font-semibold text-white mb-1">Your chats {'>'}</h2>
          </div>

          {Object.entries(groupedChats).map(([groupName, groupChats]) => (
            groupChats.length > 0 && (
              <div key={groupName} className="mb-4">
                <h3 className="text-[11px] font-semibold text-white mb-1 px-2">{groupName}</h3>
                <div className="space-y-0.5">
                  {groupChats.map(chat => (
                    <div
                      key={chat._id}
                      onClick={() => loadChat(chat._id)}
                      className={`group relative flex justify-between p-2 rounded-md cursor-pointer transition ${openMenuId === chat._id ? 'z-50' : 'z-0'} ${activeChatId === chat._id ? 'bg-white/20 text-white border border-white/30' : 'hover:bg-white/10 text-white/90 hover:text-white border border-transparent'}`}
                    >
                      <div className="flex flex-col overflow-hidden w-full pr-6">
                        <span className="truncate text-[13px] font-medium leading-tight">{chat.title}</span>
                        <span className="text-[10px] text-white/60 mt-0.5 flex items-center justify-between">
                          <span>{new Date(chat.createdAt).toLocaleDateString()}</span>
                        </span>
                      </div>

                      <div className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center ${activeChatId === chat._id || openMenuId === chat._id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                        <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === chat._id ? null : chat._id); }} className="p-1 text-white/80 hover:text-white rounded-md transition hover:bg-white/20" title="Options">
                          <MoreHorizontal size={15} />
                        </button>

                        {openMenuId === chat._id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 top-7 w-40 bg-white border border-gray-200 shadow-lg rounded-lg shadow-xl z-[80] overflow-hidden text-sm text-[#0a192f]"
                          >
                            <div className="flex flex-col py-1">
                              <button onClick={(e) => { setOpenMenuId(null); renameChat(e, chat._id, chat.title); }} className="flex items-center gap-2 w-full text-left px-3 py-2 text-[#0a192f] hover:bg-[#0a192f]/10 hover:text-[#0a192f] transition">
                                <Edit3 size={14} /> Rename
                              </button>
                              <button onClick={(e) => { setOpenMenuId(null); deleteChat(e, chat._id); }} className="flex items-center gap-2 w-full text-left px-3 py-2 text-red-600 hover:bg-red-500/10 hover:text-red-700 transition">
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          ))}
          {chats.length === 0 && !searchQuery && (
            <div className="text-center text-sm text-white/80 mt-10 px-4">No previous chats recorded. Start a new one!</div>
          )}
          {chats.length > 0 && searchQuery && Object.values(groupedChats).every(group => group.length === 0) && (
            <div className="text-center text-sm text-white mt-10 px-4 flex flex-col items-center">
              <Search size={24} className="mb-2 opacity-50" />
              No chats found matching "<span className="text-white font-bold">{searchQuery}</span>"
            </div>
          )}
        </div>

        {/* User Profile Footer */}
        <div className="p-3 border-t border-white/20 bg-[#0a192f] relative">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setShowUserMenu(!showUserMenu);
            }}
            className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-white/10 text-left transition cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border border-white/30 text-[#0a192f] font-bold text-sm">
              👤
            </div>
            <span className="flex-1 truncate text-sm font-medium text-white transition">
              {user ? user.name : 'Passenger'}
            </span>
          </button>

          {showUserMenu && (
            <div className="absolute bottom-14 left-3 right-3 bg-white border border-gray-200 shadow-lg rounded-lg shadow-xl z-[90] overflow-hidden text-sm">
              <div className="flex flex-col py-1">
                <button 
                  onClick={() => {
                    setShowUserMenu(false);
                    fetchUserBookings();
                  }} 
                  className="flex items-center gap-2 w-full text-left px-4 py-3 text-[#0a192f] hover:bg-[#0a192f]/10 hover:text-[#0a192f] transition cursor-pointer font-medium"
                >
                  ✈️ My Bookings
                </button>
                <button 
                  onClick={handleLogout} 
                  className="flex items-center gap-2 w-full text-left px-4 py-3 text-red-600 hover:bg-red-500/10 hover:text-red-700 border-t border-gray-100 transition cursor-pointer font-medium"
                >
                  🚪 Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col h-full bg-transparent relative transition-all min-w-0 p-2 sm:p-4">
        
        {/* Background decorative elements (Sci-Fi Vibe) */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:20px_20px]"></div>

        {/* Glowing border container */}
        <div className="flex flex-1 flex-col h-full relative rounded-2xl border border-[#87CEEB]/30 shadow-md overflow-hidden bg-white/90 backdrop-blur-2xl">
          
          <header className="bg-transparent border-b border-[#87CEEB]/30 p-3 sm:p-4 z-10 flex justify-between items-center shadow-sm">
            <div className="flex items-center gap-3">
              <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-[#000080] hover:bg-[#87CEEB]/10 rounded-lg transition">
                <Menu size={20} />
              </button>
              <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2 text-[#000080]">
                <span className="text-[#87CEEB]">✈️</span> FlightAgent AI
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm text-[#000080] hidden sm:inline">Model:</span>
                <select
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  className="bg-white/80 text-[#000080] text-xs sm:text-sm border border-[#87CEEB]/30 rounded-lg p-1.5 focus:border-[#87CEEB] focus:ring-1 focus:ring-[#87CEEB]/50 focus:outline-none cursor-pointer hover:bg-white/80 transition"
                >
                  <option value="openai">GPT-4o Mini</option>
                  <option value="gemini">Gemini 3.0 Flash</option>
                </select>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto px-3 sm:px-4 md:px-6 py-6 w-full max-w-4xl mx-auto space-y-6 relative z-10">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex flex-col w-full ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              {editingIndex === index ? (
                <div className="w-full sm:w-[85%] bg-white/80 border border-[#87CEEB]/30 rounded-xl p-3 shadow-sm mb-2">
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full resize-none outline-none bg-transparent p-2 text-[#000080]"
                    rows={3}
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button onClick={cancelEditing} className="px-3 py-1.5 text-sm rounded bg-[#87CEEB]/30 text-[#000080] hover:bg-[#87CEEB]/50 transition">Cancel</button>
                    <button onClick={() => submitEdit(index)} className="px-3 py-1.5 text-sm rounded bg-[#87CEEB] text-[#000080] hover:bg-white/80 transition">Resend</button>
                  </div>
                </div>
              ) : (
                <div className={`group flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[95%] sm:max-w-[85%]`}>
                  <div
                    className={`flex flex-col gap-2 p-4 sm:p-5 ${msg.role === 'user'
                      ? 'bg-[#87CEEB]/10 border border-[#87CEEB]/30 text-[#000080] rounded-2xl rounded-br-sm shadow-sm backdrop-blur-md'
                      : 'bg-white border border-[#87CEEB]/30 text-[#000080] rounded-2xl rounded-bl-sm shadow-sm backdrop-blur-md markdown-body'
                      }`}
                  >
                    {msg.image && (
                      <div className="relative group max-w-[240px] rounded-lg overflow-hidden border border-[#87CEEB]/30 shadow-md mb-2 bg-white/80">
                        <img src={msg.image} alt="Uploaded Passport/ID Scan" className="max-h-[160px] object-cover w-full" />
                        <div className="absolute inset-0 bg-[#87CEEB]/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-xs text-[#000080] font-bold font-mono tracking-wider">PASSPORT SCAN</span>
                        </div>
                      </div>
                    )}
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-[#000080] underline hover:text-[#87CEEB] transition-colors" />
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>

                    {/* Action Icons */}
                    <div className={`flex items-center gap-2 self-end transition-opacity ${msg.role === 'user' ? 'text-[#87CEEB] opacity-0 group-hover:opacity-100' : 'text-[#000080] opacity-100'}`}>
                      {msg.role === 'user' && (
                        <button onClick={() => startEditing(index, msg.content)} className="hover:text-[#000080] transition" title="Edit message">
                          <Edit2 size={14} />
                        </button>
                      )}
                      <button onClick={() => handleCopy(msg.content, index)} className={`hover:text-[#000080] transition ${msg.role === 'user' ? 'hover:text-[#000080]' : 'hover:text-[#000080]'}`} title="Copy message text">
                        {copiedIndex === index ? <Check size={14} className={msg.role === 'user' ? "text-green-300" : "text-green-600"} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex w-full justify-start">
              <div className="p-4 bg-[#e0f7fa] border border-[#87CEEB]/30 rounded-2xl rounded-bl-sm text-[#000080] flex items-center gap-2 backdrop-blur-md">
                <div className="w-2.5 h-2.5 bg-[#87CEEB] rounded-full animate-bounce shadow-[0_0_8px_#3b82f6]"></div>
                <div className="w-2.5 h-2.5 bg-[#87CEEB]/80 rounded-full animate-bounce shadow-[0_0_8px_#3b82f6]" style={{ animationDelay: '0.15s' }}></div>
                <div className="w-2.5 h-2.5 bg-[#87CEEB]/60 rounded-full animate-bounce shadow-[0_0_8px_#3b82f6]" style={{ animationDelay: '0.3s' }}></div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </main>

        <footer className="bg-transparent p-3 sm:p-4 flex-shrink-0 relative z-10">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Image preview strip */}
          {selectedImage && (
            <div className="max-w-3xl mx-auto mb-2 px-2">
              <div className="flex items-center gap-2 bg-white/95 border border-[#87CEEB]/30 rounded-2xl px-3 py-2 w-fit">
                <img src={selectedImage} alt="Attached" className="h-10 w-10 object-cover rounded-lg border border-[#87CEEB]/50" />
                <div className="text-xs flex flex-col">
                  <span className="text-[#000080] font-semibold font-mono">Passport / ID</span>
                  <span className="text-[#000080]">Ready for AI scan</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedImage(null)}
                  className="ml-2 text-[#000080] hover:text-red-600 transition"
                  title="Remove attachment"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="max-w-3xl mx-auto flex flex-col sm:flex-row gap-2 relative bg-white/95 backdrop-blur-md rounded-full border border-[#87CEEB]/30 shadow-sm focus-within:border-[#87CEEB]/60 focus-within:shadow-md transition-all px-2 py-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="E.g. I need a flight from NYC to London..."
              className="flex-1 p-2 pl-4 bg-transparent focus:outline-none text-sm sm:text-base text-[#000080] placeholder-[#3b82f6]/40"
              disabled={isLoading}
            />

            <div className="flex items-center gap-2 pr-2">
              {/* Passport / ID Scanner button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`p-2 rounded-full transition-colors ${selectedImage ? 'bg-[#87CEEB]/20 text-[#000080] border border-[#87CEEB]/50' : 'text-[#87CEEB]/60 hover:text-[#000080] hover:bg-[#87CEEB]/10'}`}
                title="Scan Passport / ID with AI Vision"
              >
                <Paperclip size={18} />
              </button>

              <button
                type="button"
                onClick={startListening}
                className={`p-2 rounded-full transition-colors ${isListening ? 'bg-red-500/20 text-red-500' : 'text-[#87CEEB]/60 hover:text-[#000080] hover:bg-[#87CEEB]/10'
                  }`}
                title="Voice input"
              >
                {isListening ? <StopCircle size={20} className="animate-pulse" /> : <Mic size={20} />}
              </button>

              <button
                type="submit"
                disabled={isLoading || (!input.trim() && !selectedImage)}
                className={`p-2 rounded-full transition-all flex justify-center items-center h-10 w-10 ${isLoading || (!input.trim() && !selectedImage)
                  ? 'bg-transparent text-[#87CEEB]/30'
                  : 'bg-[#87CEEB]/20 text-[#000080] border border-[#87CEEB]/50 shadow-[0_0_10px_rgba(135,206,235,0.2)] hover:bg-[#87CEEB]/40'
                  }`}
              >
                <Send size={18} className={(input.trim() || selectedImage) && !isLoading ? 'transform translate-x-[-1px] translate-y-[1px]' : ''} />
              </button>
            </div>
          </form>
          <div className="text-center text-xs text-[#87CEEB]/50 mt-3">
            FlightAgent AI can make mistakes. Verify flight details before completing payments.
          </div>
        </footer>
        </div>
      </div>

      {showSeatMap && (
        <div className="fixed inset-0 bg-[#87CEEB]/45 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white/80 border border-[#87CEEB]/50 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-[0_0_30px_rgba(135,206,235,0.2)]">
            
            {/* Modal Header */}
            <header className="p-4 border-b border-[#87CEEB]/30 flex justify-between items-center bg-white/95">
              <h3 className="text-[#000080] font-bold text-lg flex items-center gap-2">
                💺 Interactive Seat Map
              </h3>
              <button 
                onClick={() => setShowSeatMap(false)}
                className="text-[#000080] hover:text-[#000080] transition"
              >
                <X size={20} />
              </button>
            </header>

            {/* Cabin Class Context */}
            <div className="flex justify-center p-3 border-b border-[#87CEEB]/10 bg-[#e0f7fa]">
              <span className="px-4 py-1.5 rounded-full text-xs font-semibold capitalize bg-[#87CEEB] text-[#000080] shadow-[0_0_10px_rgba(0,0,128,0.4)]">
                {seatCabinClass} Class
              </span>
            </div>

            {/* Seat Layout Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col items-center">
              <div className="w-full max-w-md bg-[#e0f7fa] border border-[#87CEEB]/30 rounded-2xl p-4 flex flex-col items-center">
                
                {/* Plane Cockpit Vibe */}
                <div className="w-24 h-12 bg-gradient-to-t from-[#E0F7FA] to-[#3b82f6]/20 border-t border-[#87CEEB]/30 rounded-t-full mb-8 flex items-center justify-center">
                  <span className="text-[10px] text-[#000080]/50 font-mono tracking-widest">COCKPIT</span>
                </div>

                {seatMapLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <div className="w-10 h-10 border-2 border-t-transparent border-[#87CEEB] rounded-full animate-spin"></div>
                    <span className="text-xs text-[#000080]/60 font-mono tracking-wide">Loading seat availability...</span>
                  </div>
                ) : (
                <>
                {/* Seat Grid Layout */}
                <div className="grid grid-cols-6 gap-2 sm:gap-3 w-full justify-items-center">
                  {/* Generate rows of seats based on selected cabin class */}
                  {Array.from({ length: seatCabinClass === 'first' ? 2 : seatCabinClass === 'business' ? 4 : 8 }).map((_, rIdx) => {
                    const rowNum = (seatCabinClass === 'first' ? 1 : seatCabinClass === 'business' ? 3 : 7) + rIdx;
                    const seatLetters = seatCabinClass === 'first' ? ['A', 'C', 'D', 'F'] : ['A', 'B', 'C', 'D', 'E', 'F'];
                    
                    return (
                      <div key={rowNum} className="col-span-6 grid grid-cols-6 gap-2 w-full items-center mt-3">
                        {/* Row Label */}
                        <span className="col-span-6 text-center text-[10px] font-mono text-[#000080]/60 mb-1">ROW {rowNum}</span>
                        
                        {seatLetters.map((letter, lIdx) => {
                          const seatId = `${rowNum}${letter}`;
                          // Real occupied seats from backend
                          const isOccupied = occupiedSeats.includes(seatId);
                          const isSelected = selectedSeats.includes(seatId);

                          return (
                            <button
                              key={seatId}
                              type="button"
                              disabled={isOccupied}
                              className={`
                                flex items-center justify-center 
                                h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl 
                                font-bold text-xs sm:text-sm transition-all duration-300
                                ${isSelected
                                  ? 'bg-[#87CEEB] text-[#000080] shadow-[0_0_15px_rgba(59,130,246,0.6)] scale-110 z-10'
                                  : isOccupied
                                    ? 'bg-[#1b222c] text-[#000080]/30 border border-[#1e293b] cursor-not-allowed'
                                    : 'bg-[#e0f7fa]/40 text-[#000080] border border-[#87CEEB]/50 hover:border-[#87CEEB] hover:bg-[#87CEEB]/20'
                                }
                              `}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedSeats(selectedSeats.filter(s => s !== seatId));
                                } else {
                                  if (selectedSeats.length >= maxSeatSelection) {
                                    // If exceeded max seats, replace the first selected
                                    setSelectedSeats([...selectedSeats.slice(1), seatId]);
                                  } else {
                                    setSelectedSeats([...selectedSeats, seatId]);
                                  }
                                }
                              }}
                              title={isOccupied ? `Seat ${seatId} is Occupied` : `Seat ${seatId}`}
                            >
                              {letter}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>

                {/* Plane Tail Vibe */}
                <div className="w-full border-b border-dashed border-[#87CEEB]/30 my-6"></div>
                <div className="flex gap-4 text-xs font-mono text-[#000080]">
                  <div className="flex items-center gap-1.5">
                    <span className="h-3.5 w-3.5 rounded border border-[#87CEEB]/50"></span> Available
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-3.5 w-3.5 rounded bg-[#87CEEB] shadow-[0_0_8px_#ffffff]"></span> Selected
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-3.5 w-3.5 rounded bg-[#1b222c] border border-#1e293b"></span> Occupied
                  </div>
                </div>

                </>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <footer className="p-4 border-t border-[#87CEEB]/30 bg-white/95 flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-xs text-[#000080] font-medium">Selected Seats:</span>
                <span className="text-[#87CEEB] font-bold text-sm tracking-wide">
                  {selectedSeats.length > 0 ? selectedSeats.join(', ') : 'None'}
                </span>
                {seatLockStatus && (
                  <span className="text-xs text-amber-700 mt-1">{seatLockStatus}</span>
                )}
              </div>
              <div className="flex gap-2">
                <div className="flex items-center gap-1 bg-white/80 border border-[#87CEEB]/30 px-3 py-1.5 rounded-lg text-xs">
                  <span className="text-[#87CEEB]">Qty:</span>
                  <select 
                    value={maxSeatSelection}
                    onChange={(e) => setMaxSeatSelection(Number(e.target.value))}
                    className="bg-transparent text-[#87CEEB] border-none focus:ring-0 cursor-pointer p-0 pr-6 text-xs font-bold"
                  >
                    {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={confirmSelectedSeats}
                  disabled={selectedSeats.length === 0}
                  className={`px-5 py-2 rounded-lg text-xs font-bold transition ${
                    selectedSeats.length > 0
                      ? 'bg-[#87CEEB] text-[#000080] hover:bg-[#1e3a8a] shadow-[0_0_12px_rgba(14,165,233,0.3)]'
                      : 'bg-[#e0f7fa] text-[#000080]/50 cursor-not-allowed'
                  }`}
                >
                  Confirm Seats
                </button>
              </div>
            </footer>

          </div>
        </div>
      )}

      {/* Bookings Modal */}
      {showBookingsModal && (
        <div className="fixed inset-0 bg-[#87CEEB]/45 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white/80 border border-[#87CEEB]/50 rounded-2xl w-full max-w-xl max-h-[80vh] overflow-hidden flex flex-col shadow-[0_0_30px_rgba(135,206,235,0.2)]">
            
            {/* Modal Header */}
            <header className="p-4 border-b border-[#87CEEB]/30 flex justify-between items-center bg-white/95">
              <h3 className="text-[#000080] font-bold text-lg flex items-center gap-2">
                ✈️ My Bookings
              </h3>
              <button 
                onClick={() => setShowBookingsModal(false)}
                className="text-[#000080] hover:text-[#000080] transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </header>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loadingBookings ? (
                <div className="flex justify-center items-center py-10">
                  <div className="w-8 h-8 border-2 border-t-transparent border-[#87CEEB] rounded-full animate-spin"></div>
                </div>
              ) : userBookings.length === 0 ? (
                <div className="text-center py-10 text-[#000080]">
                  No bookings found. Book a flight using our AI Flight Agent!
                </div>
              ) : (
                <div className="space-y-4">
                  {userBookings.map((booking) => (
                    <div 
                      key={booking._id} 
                      className="bg-white/80/80 border border-[#87CEEB]/30 hover:border-[#87CEEB]/50 rounded-xl p-4 transition-all shadow-md"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="text-xs font-mono text-[#000080] uppercase">PNR Number</span>
                          <p className="text-[#000080] font-bold tracking-widest text-lg">{booking.pnr}</p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide border ${
                          booking.bookingStatus === 'Confirmed' 
                            ? 'bg-green-500/10 text-green-700 border-green-500/30'
                            : booking.bookingStatus === 'Cancelled'
                            ? 'bg-red-500/10 text-red-600 border-red-500/30'
                            : 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30'
                        }`}>
                          {booking.bookingStatus}
                        </span>
                      </div>

                      <div className="flex items-center justify-between bg-white/90 p-3 rounded-lg border border-[#87CEEB]/30 my-3">
                        <div className="text-left">
                          <span className="text-[10px] text-[#000080] font-mono">FROM</span>
                          <p className="text-base font-bold text-[#000080]">{booking.flight?.departureAirport || 'TBD'}</p>
                          <span className="text-[10px] text-[#000080] block mt-0.5">{booking.flight?.departureCity || ''}</span>
                        </div>
                        <div className="flex flex-col items-center flex-1 px-4">
                          <span className="text-[10px] text-[#87CEEB] font-mono tracking-wider font-semibold capitalize">{booking.cabinClass}</span>
                          <div className="w-full border-t border-dashed border-[#87CEEB]/30 my-1 relative">
                            <span className="absolute -top-[5px] left-1/2 -translate-x-1/2 text-xs">✈️</span>
                          </div>
                          <span className="text-[9px] text-[#000080] font-mono">NON-STOP</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-[#000080] font-mono">TO</span>
                          <p className="text-base font-bold text-[#000080]">{booking.flight?.destinationAirport || 'TBD'}</p>
                          <span className="text-[10px] text-[#000080] block mt-0.5">{booking.flight?.destinationCity || ''}</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-xs pt-2 text-[#000080] border-t border-[#87CEEB]/30">
                        <span>Passenger: <strong className="text-[#000080]">{booking.passengers?.[0]?.name || 'N/A'}</strong></span>
                        <span>Total: <strong className="text-[#000080] font-bold">${booking.totalAmount}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <footer className="p-4 border-t border-[#87CEEB]/30 bg-white/95 flex justify-end">
              <button 
                onClick={() => setShowBookingsModal(false)}
                className="bg-[#87CEEB]/10 hover:bg-[#87CEEB]/20 text-[#000080] border border-[#87CEEB]/30 px-5 py-2 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </footer>

          </div>
        </div>
      )}
    </div>
  );
};

export default App;
