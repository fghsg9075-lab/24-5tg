
import React, { useState, useEffect } from 'react';
import { Subject, Chapter, MCQItem } from '../types';
import { SimpleRichTextEditor } from './SimpleRichTextEditor';
import { Link, Video, Save, Trash2, Database, Upload, X } from 'lucide-react';
import { getChapterData, saveChapterData, bulkSaveLinks, checkFirebaseConnection } from '../firebase';

interface Props {
  chapter: Chapter;
  subject: Subject;
  classLevel: string;
  board: string;
  stream: string | null;
  onClose: () => void;
  onSave?: () => void;
}

interface ContentConfig {
    freeLink?: string;
    premiumLink?: string;
    ultraPdfLink?: string;
    freeVideoLink?: string;
    premiumVideoLink?: string;
    freeNotesHtml?: string;
    premiumNotesHtml?: string;
    videoCreditsCost?: number;
    price?: number; // Ultra PDF Price
    manualMcqData?: MCQItem[];
    weeklyTestMcqData?: MCQItem[];
}

export const ContentEditorModal: React.FC<Props> = ({ chapter, subject, classLevel, board, stream, onClose, onSave }) => {
  const [activeTab, setActiveTab] = useState<'PDF' | 'VIDEO' | 'NOTES' | 'MCQ'>('PDF');
  const [editConfig, setEditConfig] = useState<ContentConfig>({});
  const [videoPlaylist, setVideoPlaylist] = useState<{title: string, url: string}[]>([]);
  const [editingMcqs, setEditingMcqs] = useState<MCQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [importText, setImportText] = useState('');

  // Load Data
  useEffect(() => {
      const loadContent = async () => {
          const streamKey = (classLevel === '11' || classLevel === '12') && stream ? `-${stream}` : '';
          const key = `nst_content_${board}_${classLevel}${streamKey}_${subject.name}_${chapter.id}`;
          
          let data = null;
          // Try Cloud First
          try {
              data = await getChapterData(key);
          } catch(e) {}

          // Fallback Local
          if (!data) {
              const local = localStorage.getItem(key);
              if (local) data = JSON.parse(local);
          }

          if (data) {
              setEditConfig(data);
              setVideoPlaylist(data.videoPlaylist || []);
              setEditingMcqs(data.manualMcqData || []);
          } else {
              setEditConfig({ price: 10 }); // Default Ultra Price
          }
          setLoading(false);
      };
      loadContent();
  }, [chapter.id]);

  const saveContent = () => {
      const streamKey = (classLevel === '11' || classLevel === '12') && stream ? `-${stream}` : '';
      const key = `nst_content_${board}_${classLevel}${streamKey}_${subject.name}_${chapter.id}`;
      
      const newData = {
          ...editConfig,
          videoPlaylist,
          manualMcqData: editingMcqs
      };

      localStorage.setItem(key, JSON.stringify(newData));
      saveChapterData(key, newData);
      
      alert("✅ Content Saved!");
      if (onSave) onSave();
  };

  // --- MCQ HELPERS ---
  const handleGoogleSheetImport = () => {
      if (!importText.trim()) return;
      try {
          const rawText = importText.trim();
          let newQuestions: MCQItem[] = [];
          
          // Basic Parser (Tab Separated or newlines)
          const lines = rawText.split('\n').filter(l => l.trim());
          // Simple heuristic: If line contains tabs, assume Excel copy
          // Else block format
          // For simplicity/robustness, reusing logic from AdminDashboard is best, but simplifying for modal
          // Let's assume Tab Separated: Q | A | B | C | D | Ans(1-4) | Exp
          if (rawText.includes('\t')) {
             newQuestions = lines.map(line => {
                 const cols = line.split('\t');
                 if (cols.length < 6) return null;
                 return {
                     question: cols[0],
                     options: [cols[1], cols[2], cols[3], cols[4]],
                     correctAnswer: parseInt(cols[5]) - 1,
                     explanation: cols[6] || ''
                 };
             }).filter(Boolean) as MCQItem[];
          } else {
              // Fallback: Just alerts
              alert("Please use Tab-Separated values (Copy from Excel)");
              return;
          }

          if (newQuestions.length > 0) {
              setEditingMcqs([...editingMcqs, ...newQuestions]);
              setImportText('');
              alert(`Imported ${newQuestions.length} Questions`);
          }
      } catch(e) { alert("Import Failed"); }
  };

  const addMcq = () => setEditingMcqs([...editingMcqs, { question: 'New Question', options: ['A','B','C','D'], correctAnswer: 0, explanation: '' }]);
  const updateMcq = (idx: number, field: keyof MCQItem, val: any) => {
      const updated = [...editingMcqs];
      updated[idx] = { ...updated[idx], [field]: val };
      setEditingMcqs(updated);
  };
  const updateMcqOption = (qIdx: number, oIdx: number, val: string) => {
      const updated = [...editingMcqs];
      updated[qIdx].options[oIdx] = val;
      setEditingMcqs(updated);
  };

  if (loading) return <div className="p-8 text-center">Loading Editor...</div>;

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-slate-50 border-b p-4 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-lg text-slate-800">Edit Content: {chapter.title}</h3>
                    <p className="text-xs text-slate-500">{subject.name} • Class {classLevel}</p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full"><X size={20}/></button>
            </div>

            {/* Tabs */}
            <div className="flex border-b">
                {['PDF', 'VIDEO', 'NOTES', 'MCQ'].map(tab => (
                    <button 
                        key={tab} 
                        onClick={() => setActiveTab(tab as any)}
                        className={`flex-1 py-3 text-xs font-bold transition-colors ${activeTab === tab ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                
                {/* PDF EDITOR */}
                {activeTab === 'PDF' && (
                    <div className="space-y-4 max-w-lg mx-auto">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Free PDF Link</label>
                            <input type="text" value={editConfig.freeLink || ''} onChange={e => setEditConfig({...editConfig, freeLink: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="https://..." />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Premium PDF Link</label>
                            <input type="text" value={editConfig.premiumLink || ''} onChange={e => setEditConfig({...editConfig, premiumLink: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="https://..." />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Ultra PDF Link</label>
                            <input type="text" value={editConfig.ultraPdfLink || ''} onChange={e => setEditConfig({...editConfig, ultraPdfLink: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="https://..." />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Ultra Price (Credits)</label>
                            <input type="number" value={editConfig.price} onChange={e => setEditConfig({...editConfig, price: Number(e.target.value)})} className="w-full p-2 border rounded-lg" />
                        </div>
                    </div>
                )}

                {/* VIDEO EDITOR */}
                {activeTab === 'VIDEO' && (
                    <div className="space-y-4">
                        <div className="bg-white p-4 rounded-xl border">
                            <h4 className="font-bold text-sm mb-2">Add Video</h4>
                            <div className="flex gap-2 mb-2">
                                <input id="vidTitle" type="text" placeholder="Title" className="flex-1 p-2 border rounded text-sm"/>
                                <input id="vidUrl" type="text" placeholder="URL" className="flex-[2] p-2 border rounded text-sm"/>
                            </div>
                            <button onClick={() => {
                                const t = (document.getElementById('vidTitle') as HTMLInputElement).value;
                                const u = (document.getElementById('vidUrl') as HTMLInputElement).value;
                                if(t && u) {
                                    setVideoPlaylist([...videoPlaylist, {title: t, url: u}]);
                                    (document.getElementById('vidTitle') as HTMLInputElement).value = '';
                                    (document.getElementById('vidUrl') as HTMLInputElement).value = '';
                                }
                            }} className="w-full py-2 bg-blue-100 text-blue-700 font-bold rounded hover:bg-blue-200 text-sm">+ Add to Playlist</button>
                        </div>
                        
                        <div className="space-y-2">
                            {videoPlaylist.map((vid, i) => (
                                <div key={i} className="flex justify-between bg-white p-3 rounded border items-center">
                                    <span className="text-sm font-medium">{vid.title}</span>
                                    <button onClick={() => setVideoPlaylist(videoPlaylist.filter((_, idx) => idx !== i))} className="text-red-500"><Trash2 size={16}/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* NOTES EDITOR */}
                {activeTab === 'NOTES' && (
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1">Free Notes (HTML)</label>
                            <SimpleRichTextEditor value={editConfig.freeNotesHtml || ''} onChange={h => setEditConfig({...editConfig, freeNotesHtml: h})} className="min-h-[200px] bg-white" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1">Premium Notes (HTML)</label>
                            <SimpleRichTextEditor value={editConfig.premiumNotesHtml || ''} onChange={h => setEditConfig({...editConfig, premiumNotesHtml: h})} className="min-h-[200px] bg-white border-purple-200" />
                        </div>
                    </div>
                )}

                {/* MCQ EDITOR */}
                {activeTab === 'MCQ' && (
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <textarea value={importText} onChange={e => setImportText(e.target.value)} placeholder="Paste Excel Data (Q | A | B | C | D | Ans | Exp)" className="flex-1 p-2 border rounded text-xs h-20" />
                            <button onClick={handleGoogleSheetImport} className="px-4 bg-green-100 text-green-700 font-bold rounded text-xs flex flex-col items-center justify-center"><Upload size={16}/> Import</button>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="font-bold text-sm">{editingMcqs.length} Questions</span>
                            <button onClick={addMcq} className="text-blue-600 text-xs font-bold">+ Add Question</button>
                        </div>
                        <div className="space-y-3">
                            {editingMcqs.map((q, i) => (
                                <div key={i} className="bg-white p-3 rounded border">
                                    <div className="flex justify-between mb-2">
                                        <span className="font-bold text-xs text-slate-400">Q{i+1}</span>
                                        <button onClick={() => setEditingMcqs(editingMcqs.filter((_, idx) => idx !== i))} className="text-red-400"><Trash2 size={14}/></button>
                                    </div>
                                    <input type="text" value={q.question} onChange={e => updateMcq(i, 'question', e.target.value)} className="w-full p-2 border rounded mb-2 text-sm" placeholder="Question" />
                                    <div className="grid grid-cols-2 gap-2 mb-2">
                                        {q.options.map((opt, oIdx) => (
                                            <div key={oIdx} className="flex gap-1">
                                                <input type="radio" checked={q.correctAnswer === oIdx} onChange={() => updateMcq(i, 'correctAnswer', oIdx)} />
                                                <input type="text" value={opt} onChange={e => updateMcqOption(i, oIdx, e.target.value)} className="w-full p-1 border rounded text-xs" />
                                            </div>
                                        ))}
                                    </div>
                                    <input type="text" value={q.explanation} onChange={e => updateMcq(i, 'explanation', e.target.value)} className="w-full p-2 border border-dashed rounded text-xs" placeholder="Explanation" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-white flex justify-end gap-2">
                <button onClick={onClose} className="px-6 py-2 text-slate-500 font-bold">Cancel</button>
                <button onClick={saveContent} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg shadow hover:bg-blue-700 flex items-center gap-2">
                    <Save size={18} /> Save Changes
                </button>
            </div>
        </div>
    </div>
  );
};
