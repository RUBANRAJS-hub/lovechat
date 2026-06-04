'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import Navbar from '../../components/Navbar';
import { apiRequest } from '../../lib/api';
import { 
  Image as ImageIcon, Upload, Search, Tag, Trash2, Calendar, 
  Loader2, Plus, Sparkles, Folder, Eye, Lock, Globe, X
} from 'lucide-react';

export default function VaultPage() {
  const router = useRouter();
  const auth = useAuthStore();

  const [memories, setMemories] = useState<any[]>([]);
  const [albums, setAlbums] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'normal' | 'travel' | 'secret'>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Creation States
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'normal' | 'travel' | 'secret'>('normal');
  const [date, setDate] = useState('');
  const [tags, setTags] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  // Lightbox overlay
  const [lightboxMemory, setLightboxMemory] = useState<any | null>(null);

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

  // Load memories and albums
  const loadVaultData = async () => {
    setLoading(true);
    try {
      let endpoint = '/vault/memories?';
      if (selectedCategory !== 'all') {
        endpoint += `category=${selectedCategory}&`;
      }
      if (selectedTag) {
        endpoint += `tag=${selectedTag}&`;
      }
      if (searchQuery) {
        endpoint += `search=${searchQuery}&`;
      }

      const memoriesData = await apiRequest(endpoint, 'GET');
      setMemories(memoriesData);

      const albumsData = await apiRequest('/vault/albums', 'GET');
      setAlbums(albumsData);
    } catch (err) {
      console.error('Failed to load memory vault', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth.token && auth.user?.partnerId) {
      loadVaultData();
    }
  }, [auth.token, auth.user, selectedCategory, selectedTag, searchQuery]);

  const handleCreateMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !title) return;

    setCreating(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('title', title);
    formData.append('description', description);
    formData.append('category', category);
    formData.append('date', date || new Date().toISOString());
    formData.append('tags', tags);

    try {
      await apiRequest('/vault/memories', 'POST', formData, true);
      // Reset Form
      setTitle('');
      setDescription('');
      setCategory('normal');
      setDate('');
      setTags('');
      setSelectedFile(null);
      setShowAddModal(false);
      
      // Reload
      loadVaultData();
      // Reload user for XP level update
      auth.loadUser();
    } catch (err) {
      console.error('Error uploading memory', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteMemory = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this memory forever?')) return;

    try {
      await apiRequest(`/vault/memories/${id}`, 'DELETE');
      loadVaultData();
    } catch (err) {
      console.error('Failed to delete memory', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#060212] flex flex-col pb-16">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-8 space-y-8">
        {/* Header Title Section */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-pink-500 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4" /> Shared Memory Vault
            </span>
            <h2 className="text-3xl font-extrabold text-white">Capture Your Journey</h2>
            <p className="text-slate-400 text-sm">
              Keep photos, videos, and secrets saved in your private digital scrapbook.
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-600 hover:to-violet-700 text-white font-bold px-6 py-3.5 rounded-2xl shadow-lg shadow-pink-500/20 transition-all duration-200 active:scale-[0.98]"
          >
            <Plus className="w-5 h-5" /> Add New Memory
          </button>
        </section>

        {/* Filter Toolbar */}
        <section className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Categories Tab selectors */}
          <div className="lg:col-span-3 flex overflow-x-auto gap-2 p-1.5 bg-slate-950/45 border border-slate-900 rounded-2xl">
            {[
              { id: 'all', label: 'All Memories', icon: Folder },
              { id: 'normal', label: 'Standard Vault', icon: Globe },
              { id: 'travel', label: 'Travel Logs', icon: Sparkles },
              { id: 'secret', label: 'Secret Room', icon: Lock }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setSelectedCategory(tab.id as any);
                    setSelectedTag(null); // clear tag filter
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    selectedCategory === tab.id
                      ? 'bg-pink-500/10 border border-pink-500/30 text-pink-400'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" /> {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search memories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full glass-input pl-10 pr-4 py-3 rounded-2xl text-xs"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
          </div>
        </section>

        {/* Main Grid: sidebar albums vs memories list */}
        <section className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Column: Aggregated Albums/Tags */}
          <div className="glass-panel p-6 rounded-3xl space-y-4 h-fit">
            <h3 className="text-white font-bold text-sm flex items-center gap-2">
              <Tag className="w-4 h-4 text-pink-500" /> Filter by Tag
            </h3>
            
            <div className="flex flex-wrap lg:flex-col gap-2">
              <button
                onClick={() => setSelectedTag(null)}
                className={`px-3 py-2 rounded-xl text-xs font-bold text-left transition-all ${
                  selectedTag === null 
                    ? 'bg-slate-900 border border-pink-500/30 text-pink-400' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🏷️ Show All Tags
              </button>
              {albums.length === 0 ? (
                <div className="text-[11px] text-slate-500 font-semibold p-2">
                  No tags added yet.
                </div>
              ) : (
                albums.map((a) => (
                  <button
                    key={a.name}
                    onClick={() => setSelectedTag(a.name)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold text-left transition-all flex justify-between items-center ${
                      selectedTag === a.name 
                        ? 'bg-slate-900 border border-pink-500/30 text-pink-400' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
                    }`}
                  >
                    <span># {a.name}</span>
                    <span className="bg-slate-950 px-2 py-0.5 rounded-md text-[10px] font-extrabold text-slate-500 border border-slate-905">
                      {a.count}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right Column: Memories Grid */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="h-64 flex justify-center items-center">
                <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
              </div>
            ) : memories.length === 0 ? (
              <div className="glass-panel p-12 rounded-3xl text-center space-y-3">
                <ImageIcon className="w-12 h-12 text-slate-800 mx-auto" />
                <h4 className="text-white font-bold text-base">No memories found</h4>
                <p className="text-slate-500 text-xs max-w-sm mx-auto">
                  Click 'Add New Memory' above to populate this category folder with your favorite relationship milestones.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {memories.map((m) => (
                  <div
                    key={m._id}
                    onClick={() => setLightboxMemory(m)}
                    className="glass-panel rounded-2xl overflow-hidden cursor-pointer hover:border-pink-500/30 hover:shadow-lg hover:shadow-pink-500/5 transition-all group"
                  >
                    {/* Media Thumbnail */}
                    <div className="aspect-video relative bg-slate-950 overflow-hidden border-b border-slate-900 flex items-center justify-center">
                      {m.mediaType === 'image' ? (
                        <img
                          src={m.mediaUrl}
                          alt={m.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-slate-400">
                          <Eye className="w-8 h-8" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">
                            Play {m.mediaType}
                          </span>
                        </div>
                      )}
                      
                      <span className="absolute top-3 left-3 bg-slate-950/80 px-2 py-1 rounded-lg text-[9px] font-extrabold uppercase border border-slate-805 text-pink-400 tracking-wider">
                        {m.category}
                      </span>
                    </div>

                    {/* Metadata Content */}
                    <div className="p-4 space-y-3">
                      <div className="space-y-1">
                        <h4 className="text-white font-bold text-sm block truncate group-hover:text-pink-400 transition-colors">
                          {m.title}
                        </h4>
                        <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed">
                          {m.description || 'No description provided.'}
                        </p>
                      </div>

                      {/* Tags */}
                      {m.tags && m.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {m.tags.map((t: string) => (
                            <span
                              key={t}
                              className="text-[9px] font-extrabold text-violet-400 bg-violet-500/5 px-2 py-0.5 border border-violet-500/10 rounded-md"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Footer Info */}
                      <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold border-t border-slate-900 pt-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(m.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <button
                          onClick={(e) => handleDeleteMemory(m._id, e)}
                          className="text-slate-600 hover:text-rose-500 p-1"
                          title="Delete Memory"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* --- ADD NEW MEMORY MODAL --- */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel-glow max-w-md w-full p-6 rounded-3xl space-y-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-pink-500 animate-bounce" /> Add Vault Memory
            </h3>
            
            <form onSubmit={handleCreateMemory} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Memory Title</label>
                <input
                  type="text"
                  placeholder="Beach Sunset Trip"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Description</label>
                <textarea
                  placeholder="It was so beautiful when the sun touched the waves..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs h-20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full glass-input px-3 py-2.5 rounded-xl text-xs bg-slate-950"
                  >
                    <option value="normal">Standard Vault</option>
                    <option value="travel">Travel Log</option>
                    <option value="secret">Secret Room</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Memory Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs text-center"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tags (comma-separated)</label>
                <input
                  type="text"
                  placeholder="adventure, sunset, 2026"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Upload File (Image/Video)</label>
                <input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-pink-500/10 file:text-pink-400 hover:file:bg-pink-500/20 file:cursor-pointer"
                  required
                  accept="image/*,video/*,audio/*"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 bg-slate-900 border border-slate-800 text-slate-400 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-violet-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-pink-500/20"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Memory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- LIGHTBOX MODAL --- */}
      {lightboxMemory && (
        <div 
          onClick={() => setLightboxMemory(null)}
          className="fixed inset-0 bg-black/95 flex flex-col justify-center items-center z-50 p-4 cursor-zoom-out"
        >
          <div className="max-w-4xl w-full flex flex-col items-center gap-4 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="max-h-[75vh] max-w-full overflow-hidden rounded-2xl glass-panel-glow p-2 relative">
              <button 
                onClick={() => setLightboxMemory(null)}
                className="absolute top-4 right-4 p-2 bg-slate-950/80 rounded-xl border border-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
              {lightboxMemory.mediaType === 'image' ? (
                <img 
                  src={lightboxMemory.mediaUrl} 
                  alt={lightboxMemory.title} 
                  className="max-h-[70vh] max-w-full object-contain rounded-xl"
                />
              ) : (
                <video 
                  src={lightboxMemory.mediaUrl} 
                  controls 
                  autoPlay 
                  className="max-h-[70vh] max-w-full rounded-xl"
                />
              )}
            </div>
            
            <div className="space-y-1.5 max-w-xl">
              <h3 className="text-2xl font-bold text-white">{lightboxMemory.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{lightboxMemory.description || 'No description'}</p>
              <div className="flex justify-center gap-2 pt-1">
                {lightboxMemory.tags?.map((t: string) => (
                  <span key={t} className="text-[10px] font-extrabold text-violet-400 bg-violet-500/10 px-2.5 py-1 rounded-md border border-violet-500/10">
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
