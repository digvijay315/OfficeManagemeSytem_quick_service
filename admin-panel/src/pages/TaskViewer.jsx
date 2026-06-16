import React, { useState, useEffect } from 'react';
import api from '../api';
import { AlertCircle, CheckCircle, Clock, ChevronDown, ChevronUp, AlertTriangle, User, Calendar, MapPin, Download, Edit2, Trash2, X } from 'lucide-react';
import Swal from 'sweetalert2';

const AddressDisplay = ({ coords }) => {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchAddress = async () => {
    setLoading(true);
    try {
      const [lat, lon] = coords.split(',').map(s => s.trim());
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
      const data = await res.json();
      setAddress(data.display_name || 'Address not found');
    } catch (err) {
      setAddress('Error fetching address');
    } finally {
      setLoading(false);
    }
  };

  if (!coords || coords.includes('Denied') || coords.includes('Fetching') || coords.includes('supported')) return null;

  return (
    <div className="mt-1.5 text-xs bg-white p-2 rounded border border-gray-200 shadow-sm text-left">
      {!address && !loading && (
        <button onClick={fetchAddress} className="text-blue-600 hover:underline font-semibold flex items-center gap-1">
          <MapPin size={12}/> Fetch Address
        </button>
      )}
      {loading && <span className="text-gray-400 animate-pulse">Fetching...</span>}
      {address && <span className="text-gray-700 font-medium leading-relaxed block">{address}</span>}
    </div>
  );
};

export default function TaskViewer() {
  const [groupedTasks, setGroupedTasks] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [expandedRows, setExpandedRows] = useState({});
  const [editModalTask, setEditModalTask] = useState(null);
  
  // Filters & Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  
  const [selectedStaff, setSelectedStaff] = useState('');
  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const getTomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };
  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'today', 'tomorrow', or 'YYYY-MM-DD'

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res = await api.get('/admin/staff?limit=1000');
        setStaffList(res.data.data);
      } catch (err) {
        console.error('Error fetching staff');
      }
    };
    fetchStaff();
  }, []);

  const fetchGroupedTasks = async (pageToFetch = 1) => {
    setLoading(true);
    try {
      let query = `/admin/tasks/grouped?page=${pageToFetch}&limit=10`;
      if (selectedStaff) query += `&staff_id=${selectedStaff}`;
      if (dateFilter) query += `&dateFilter=${dateFilter}`;
      
      const res = await api.get(query);
      setGroupedTasks(res.data.data || []);
      setTotalPages(res.data.pages || 1);
      setPage(res.data.page || 1);
    } catch (err) {
      console.error('Error fetching grouped tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      let query = `/admin/tasks/export?`;
      if (selectedStaff) query += `staff_id=${selectedStaff}&`;
      if (dateFilter) query += `dateFilter=${dateFilter}&`;
      
      const res = await api.get(query, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'tasks_export.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error exporting tasks', err);
      alert('Failed to export tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (taskId) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/admin/tasks/${taskId}`);
        Swal.fire('Deleted!', 'Task has been deleted.', 'success');
        fetchGroupedTasks(page);
      } catch (err) {
        Swal.fire('Error', 'Failed to delete task', 'error');
      }
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/admin/tasks/${editModalTask._id}`, editModalTask);
      Swal.fire('Updated!', 'Task has been updated.', 'success');
      setEditModalTask(null);
      fetchGroupedTasks(page);
    } catch (err) {
      Swal.fire('Error', 'Failed to update task', 'error');
    }
  };

  useEffect(() => {
    fetchGroupedTasks(page);
  }, [page, selectedStaff, dateFilter]);

  const toggleRow = (groupId) => {
    setExpandedRows(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl border border-gray-100 shadow-sm gap-4">
        <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <CheckCircle size={28} className="text-indigo-600" /> Task Viewer
            </h2>
            <p className="text-gray-500 text-sm mt-1">Monitor all staff tasks organized by date and person.</p>
        </div>
        
        <div className="flex flex-col md:flex-row flex-wrap items-start md:items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 w-full md:w-auto">
            <User size={16} className="text-gray-500 shrink-0" />
            <select 
              className="text-sm bg-transparent outline-none text-gray-700 w-full"
              value={selectedStaff}
              onChange={(e) => { setSelectedStaff(e.target.value); setPage(1); }}
            >
              <option value="">All Staff Members</option>
              {staffList.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="flex bg-gray-100 p-1 rounded-lg w-full md:w-auto overflow-x-auto hide-scrollbar">
            <button 
              onClick={() => { setDateFilter('all'); setPage(1); }}
              className={`flex-1 md:flex-none px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${dateFilter === 'all' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
            >
              All Dates
            </button>
            <button 
              onClick={() => { setDateFilter('today'); setPage(1); }}
              className={`flex-1 md:flex-none px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${dateFilter === 'today' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Today
            </button>
            <button 
              onClick={() => { setDateFilter('tomorrow'); setPage(1); }}
              className={`flex-1 md:flex-none px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${dateFilter === 'tomorrow' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Tomorrow
            </button>
          </div>
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 w-full md:w-auto">
             <Calendar size={16} className="text-gray-500 shrink-0" />
             <input 
                type="date" 
                value={!['all', 'today', 'tomorrow'].includes(dateFilter) ? dateFilter : ''}
                onChange={(e) => { setDateFilter(e.target.value || 'all'); setPage(1); }}
                className="text-sm bg-transparent outline-none text-gray-700 w-full"
             />
          </div>
          <button 
            onClick={handleExport}
            disabled={loading}
            className="flex justify-center items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 w-full md:w-auto shadow-sm"
          >
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-indigo-50 text-indigo-900 border-b border-indigo-100">
              <tr>
                <th className="px-6 py-4 font-semibold w-1/4">Staff Member</th>
                <th className="px-6 py-4 font-semibold w-1/6">Date</th>
                <th className="px-6 py-4 font-semibold w-1/3">Tasks</th>
                <th className="px-6 py-4 font-semibold w-1/4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                        <div className="flex justify-center mb-2">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                        </div>
                        Loading tasks...
                    </td>
                </tr>
              ) : (!groupedTasks || groupedTasks.length === 0) ? (
                <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                        No tasks found matching your filters.
                    </td>
                </tr>
              ) : (
                groupedTasks.map((group) => {
                  const tasks = group.tasks || [];
                  const groupId = `${group.date}-${group.staff_id}`;
                  const isExpanded = !!expandedRows[groupId];
                  const firstTaskTitle = tasks[0]?.title || "No Title";
                  const remainingCount = tasks.length - 1;
                  const allCompleted = tasks.every(t => t.status === 'completed');
                  const hasEmergency = tasks.some(t => t.type === 'emergency' && t.status !== 'completed');

                  return (
                    <React.Fragment key={groupId}>
                      {/* Main Group Row */}
                      <tr 
                        className="hover:bg-gray-50 cursor-pointer transition-colors group"
                        onClick={() => toggleRow(groupId)}
                      >
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                                {group.staff?.Upload?.pic?.[0] ? (
                                    <img src={group.staff.Upload.pic[0]} alt="avatar" className="w-8 h-8 rounded-full object-cover border border-gray-200" />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs border border-indigo-200">
                                        {group.staff?.name ? group.staff.name.charAt(0).toUpperCase() : '?'}
                                    </div>
                                )}
                                <div>
                                    <p className="font-semibold text-gray-800">{group.staff?.name || 'Unknown Staff'}</p>
                                    <p className="text-xs text-gray-500">{group.staff?.email || ''}</p>
                                </div>
                            </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-800">
                            {group.date}
                        </td>
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                                <span className={`font-medium ${hasEmergency ? 'text-red-600' : 'text-gray-800'}`}>
                                    {firstTaskTitle}
                                </span>
                                {remainingCount > 0 && (
                                    <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full font-medium">
                                        + {remainingCount} more
                                    </span>
                                )}
                                {hasEmergency && (
                                    <AlertTriangle size={14} className="text-red-500" />
                                )}
                            </div>
                        </td>
                        <td className="px-6 py-4">
                            <div className="flex justify-between items-center">
                                {allCompleted ? (
                                    <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg text-xs font-semibold border border-emerald-200">
                                        <CheckCircle size={14}/> All Completed
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg text-xs font-semibold border border-amber-200">
                                        <Clock size={14}/> Pending Actions
                                    </span>
                                )}
                                <div className="text-gray-400 group-hover:text-gray-600 transition-colors">
                                    {isExpanded ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                                </div>
                            </div>
                        </td>
                      </tr>

                      {/* Expanded Details Row */}
                      {isExpanded && (
                        <tr>
                            <td colSpan="4" className="bg-gray-50/50 p-0 border-b-2 border-indigo-100">
                                <div className="p-4 md:p-6 bg-indigo-50/30 border-l-4 border-indigo-400 m-2 md:m-4 rounded-r-xl shadow-inner w-full box-border">
                                    <h4 className="text-sm font-bold text-gray-500 mb-4 uppercase tracking-wider">Detailed Tasks for {group.staff?.name} on {group.date}</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {tasks.map(task => (
                                            <div key={task._id} className={`p-4 rounded-xl border ${task.type === 'emergency' ? 'border-red-200 bg-red-50' : 'border-white bg-white'} shadow-sm relative group`}>
                                                {task.status !== 'completed' && (
                                                    <div className="absolute top-2 right-2 flex gap-2">
                                                        <button onClick={() => setEditModalTask({...task, date: task.date || ''})} className="p-1.5 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200 transition-colors" title="Edit"><Edit2 size={14}/></button>
                                                        <button onClick={() => handleDelete(task._id)} className="p-1.5 bg-red-100 text-red-600 rounded-md hover:bg-red-200 transition-colors" title="Delete"><Trash2 size={14}/></button>
                                                    </div>
                                                )}
                                                <div className="flex justify-between items-start mb-2 pr-14">
                                                    <h5 className={`font-bold ${task.type === 'emergency' ? 'text-red-700' : 'text-gray-800'}`}>
                                                    {task.title}
                                                    </h5>
                                                    {task.type === 'emergency' && (
                                                    <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-md font-bold">Emergency</span>
                                                    )}
                                                    {task.type === 'additional' && (
                                                    <span className="bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded-md font-bold">Self Assigned</span>
                                                    )}
                                                </div>
                                                <p className="text-gray-600 text-sm mb-4">{task.description}</p>
                                                
                                                {task.status !== 'completed' ? (
                                                    <div className="mt-4 pt-3 border-t border-gray-100">
                                                        <p className="text-sm text-amber-600 flex items-center gap-1 font-semibold"><Clock size={14}/> Pending</p>
                                                    </div>
                                                ) : (
                                                    <div className="mt-4 pt-3 border-t border-gray-100">
                                                      <p className="text-sm text-emerald-600 flex items-center gap-1 font-semibold"><CheckCircle size={14}/> Completed</p>
                                                      {task.comment && <p className="text-xs text-gray-500 mt-1 bg-gray-50 p-2 rounded border border-gray-100">"{task.comment}"</p>}
                                                      
                                                      {task.paymentAmount > 0 && (
                                                        <p className="text-xs text-gray-700 mt-2 font-medium bg-gray-50 px-2 py-1 rounded inline-block">
                                                          Payment Collected: ₹{task.paymentAmount} ({task.paymentMode})
                                                        </p>
                                                      )}

                                                      {task.completionLocation && (
                                                        <div className="mt-3">
                                                          <span className="text-xs text-gray-500 font-semibold block mb-1">Completion Location:</span>
                                                          <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                                                            <MapPin size={14} className="text-blue-500"/> {task.completionLocation}
                                                          </div>
                                                          <AddressDisplay coords={task.completionLocation} />
                                                        </div>
                                                      )}

                                                      {task.images && task.images.length > 0 && (
                                                        <div className="mt-3">
                                                          <span className="text-xs text-gray-500 font-semibold block mb-1">Work Proof:</span>
                                                          <div className="flex flex-wrap gap-2">
                                                            {task.images.map((img, i) => (
                                                              <a key={i} href={img} target="_blank" rel="noreferrer" className="block relative w-12 h-12 rounded-md overflow-hidden border border-gray-200 hover:border-indigo-400 transition-colors">
                                                                <img src={img} alt="Task proof" className="w-full h-full object-cover" />
                                                              </a>
                                                            ))}
                                                          </div>
                                                        </div>
                                                      )}

                                                      {task.paymentSlipUrls && task.paymentSlipUrls.length > 0 && (
                                                        <div className="mt-3">
                                                          <span className="text-xs text-gray-500 font-semibold block mb-1">Payment Proof:</span>
                                                          <div className="flex flex-wrap gap-2">
                                                            {task.paymentSlipUrls.map((img, i) => (
                                                              <a key={i} href={img} target="_blank" rel="noreferrer" className="block relative w-12 h-12 rounded-md overflow-hidden border border-gray-200 hover:border-indigo-400 transition-colors">
                                                                <img src={img} alt="Payment slip" className="w-full h-full object-cover" />
                                                              </a>
                                                            ))}
                                                          </div>
                                                        </div>
                                                      )}
                                                      
                                                      {task.rewardSlipUrls && task.rewardSlipUrls.length > 0 && (
                                                        <div className="mt-3">
                                                          <span className="text-xs text-emerald-600 font-semibold block mb-1">Reward Payment Proof:</span>
                                                          <div className="flex flex-wrap gap-2">
                                                            {task.rewardSlipUrls.map((img, i) => (
                                                              <a key={i} href={img} target="_blank" rel="noreferrer" className="block relative w-12 h-12 rounded-md overflow-hidden border border-emerald-200 hover:border-emerald-400 transition-colors">
                                                                <img src={img} alt="Reward Payment slip" className="w-full h-full object-cover" />
                                                              </a>
                                                            ))}
                                                          </div>
                                                        </div>
                                                      )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {!loading && totalPages > 1 && (
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <span className="text-sm text-gray-600">
                    Page <span className="font-semibold text-gray-800">{page}</span> of <span className="font-semibold text-gray-800">{totalPages}</span>
                </span>
                <div className="flex gap-2">
                    <button 
                        disabled={page === 1}
                        onClick={() => setPage(page - 1)}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Previous
                    </button>
                    <button 
                        disabled={page === totalPages}
                        onClick={() => setPage(page + 1)}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Next
                    </button>
                </div>
            </div>
        )}
      </div>

      {editModalTask && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-4 md:p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 md:mb-6 border-b pb-4 shrink-0">
              <h3 className="text-xl font-bold">Edit Task Details</h3>
              <button onClick={() => setEditModalTask(null)} className="text-gray-500 hover:text-gray-800"><X size={20}/></button>
            </div>
            <div className="overflow-y-auto pr-1 md:pr-2">
              <form onSubmit={handleEditSubmit} className="space-y-4 md:space-y-5 pb-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input required type="text" className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={editModalTask.title || ''} onChange={e => setEditModalTask({...editModalTask, title: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Task Type</label>
                  <select className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white" value={editModalTask.type || 'regular'} onChange={e => setEditModalTask({...editModalTask, type: e.target.value})}>
                    <option value="regular">Regular Task</option>
                    <option value="emergency">Emergency Task</option>
                    <option value="additional">Self Assigned</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 resize-none" rows="3" value={editModalTask.description || ''} onChange={e => setEditModalTask({...editModalTask, description: e.target.value})}></textarea>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input required type="date" className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={editModalTask.date || ''} onChange={e => setEditModalTask({...editModalTask, date: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Staff</label>
                  <select className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white" value={editModalTask.staff_id ? (editModalTask.staff_id._id || editModalTask.staff_id) : ''} onChange={e => setEditModalTask({...editModalTask, staff_id: e.target.value})}>
                    {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="pt-5 border-t border-gray-100">
                <h4 className="text-sm font-bold text-gray-800 mb-3">Customer Details (Optional)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                    <input type="text" placeholder="e.g. John Doe" className="w-full px-3 py-2 border border-gray-200 rounded-md outline-none focus:ring-2 focus:ring-indigo-500 text-sm" value={editModalTask.customer_name || ''} onChange={e => setEditModalTask({...editModalTask, customer_name: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Mobile</label>
                    <input type="text" placeholder="e.g. +91 9876543210" className="w-full px-3 py-2 border border-gray-200 rounded-md outline-none focus:ring-2 focus:ring-indigo-500 text-sm" value={editModalTask.customer_mobile || ''} onChange={e => setEditModalTask({...editModalTask, customer_mobile: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
                    <input type="text" placeholder="e.g. 123 Main St" className="w-full px-3 py-2 border border-gray-200 rounded-md outline-none focus:ring-2 focus:ring-indigo-500 text-sm" value={editModalTask.customer_address || ''} onChange={e => setEditModalTask({...editModalTask, customer_address: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="pt-2 mt-2">
                <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200">Save All Changes</button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
