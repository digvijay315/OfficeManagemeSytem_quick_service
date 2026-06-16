import { useState, useEffect } from 'react';
import api from '../api';
import { showAlert, showLoader, closeLoader } from '../utils/swalUtils';
import { Calendar, User, FileText, AlertTriangle, ClipboardList, UploadCloud, X } from 'lucide-react';

export default function TaskAssignment() {
  const [staffList, setStaffList] = useState([]);
  const [predefinedTasks, setPredefinedTasks] = useState([]);
  const [formData, setFormData] = useState({
    staff_id: '',
    title: '',
    description: '',
    customer_name: '',
    customer_mobile: '',
    customer_address: '',
    date: new Date().toISOString().split('T')[0],
    type: 'regular'
  });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(prev => [...prev, ...files]);
    
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setPreviewUrls(prev => [...prev, ...newPreviews]);
  };

  const removeFile = (indexToRemove) => {
    setSelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    setPreviewUrls(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res = await api.get('/admin/staff?limit=1000');
        setStaffList(res.data.data);
      } catch (err) {
        console.error('Error fetching staff');
      }
    };

    const fetchPredefined = async () => {
      try {
        const res = await api.get('/admin/predefined-tasks?limit=1000');
        setPredefinedTasks(res.data.data);
      } catch (err) {
        console.error('Error fetching predefined tasks');
      }
    };
    fetchStaff();
    fetchPredefined();
  }, []);

  const handleSelectPredefined = (e) => {
    const selectedTitle = e.target.value;
    if (selectedTitle === '') {
      setFormData({ ...formData, title: '', description: '' });
      return;
    }
    const matchedTask = predefinedTasks.find(t => t.title === selectedTitle);
    if (matchedTask) {
      setFormData({ ...formData, title: matchedTask.title, description: matchedTask.description || '' });
    }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!formData.staff_id) return showAlert('Error', 'Please select a staff member', 'error');
    
    showLoader('Preparing...', 'Please wait...');
    try {
      let imageUrls = [];
      if (selectedFiles.length > 0) {
        showLoader('Uploading Images', 'Please wait...');
        const uploadData = new FormData();
        selectedFiles.forEach(file => {
          uploadData.append('files', file);
        });
        const uploadRes = await api.post('/upload/upload-files', uploadData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (uploadRes.data.success) {
          imageUrls = uploadRes.data.urls;
        }
      }

      showLoader('Assigning Task', 'Saving task details...');
      await api.post('/admin/tasks', { ...formData, images: imageUrls });
      closeLoader();
      showAlert('Success', 'Task assigned successfully!', 'success');
      setFormData({ ...formData, title: '', description: '', customer_name: '', customer_mobile: '', customer_address: '' });
      setSelectedFiles([]);
      setPreviewUrls([]);
    } catch (err) {
      closeLoader();
      showAlert('Error', 'Error assigning task', 'error');
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 p-8 rounded-2xl shadow-lg text-white flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-2">
            <ClipboardList size={28} /> Assign Tasks
          </h2>
          <p className="text-blue-200">Assign regular or emergency tasks to your staff members.</p>
        </div>
        <div className="hidden md:flex h-16 w-16 bg-white/10 rounded-full items-center justify-center backdrop-blur-sm">
          <ClipboardList size={32} />
        </div>
      </div>
      
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
      
      <form onSubmit={handleAssign} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><User size={16}/> Select Staff</label>
            <select 
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
              value={formData.staff_id}
              onChange={(e) => setFormData({...formData, staff_id: e.target.value})}
              required
            >
              <option value="">-- Choose Staff --</option>
              {staffList.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><Calendar size={16}/> Task Date</label>
            <input 
              type="date" 
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              value={formData.date}
              onChange={(e) => setFormData({...formData, date: e.target.value})}
              required 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><FileText size={16}/> Select from Library</label>
            <select 
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
              onChange={handleSelectPredefined}
            >
              <option value="">-- Type Custom Task --</option>
              {predefinedTasks.map(t => (
                <option key={t.id || t._id} value={t.title}>{t.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><FileText size={16}/> Task Title</label>
            <input 
              type="text" 
              placeholder="e.g. Clean the office, File reports"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              required 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><User size={16}/> Customer Name</label>
            <input 
              type="text" 
              placeholder="e.g. John Doe"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              value={formData.customer_name}
              onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><FileText size={16}/> Customer Mobile</label>
            <input 
              type="text" 
              placeholder="e.g. +91 9876543210"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              value={formData.customer_mobile}
              onChange={(e) => setFormData({...formData, customer_mobile: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><FileText size={16}/> Customer Address</label>
            <input 
              type="text" 
              placeholder="e.g. 123 Main St"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              value={formData.customer_address}
              onChange={(e) => setFormData({...formData, customer_address: e.target.value})}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Detailed Description</label>
          <textarea 
            rows="4"
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
          ></textarea>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1"><UploadCloud size={16}/> Attach Images</label>
          <input 
            type="file" 
            multiple 
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-indigo-50 file:text-indigo-700
              hover:file:bg-indigo-100 transition-all cursor-pointer outline-none"
          />
          {previewUrls.length > 0 && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {previewUrls.map((url, index) => (
                <div key={index} className="relative group">
                  <img src={url} alt={`preview ${index}`} className="w-full h-24 object-cover rounded-lg border border-gray-200 shadow-sm" />
                  <button 
                    type="button"
                    onClick={() => removeFile(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-3">Task Priority / Type</label>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="type" 
                value="regular"
                checked={formData.type === 'regular'}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
                className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-gray-700">Regular Task</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="type" 
                value="emergency"
                checked={formData.type === 'emergency'}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
                className="w-4 h-4 text-red-600 focus:ring-red-500"
              />
              <span className="text-red-600 font-medium flex items-center gap-1"><AlertTriangle size={16}/> Emergency Task</span>
            </label>
          </div>
        </div>

        <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-blue-800 text-white py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-blue-900 transition-all shadow-lg shadow-blue-200 transform hover:-translate-y-1">
          Assign Task
        </button>
      </form>
      </div>
    </div>
  );
}
