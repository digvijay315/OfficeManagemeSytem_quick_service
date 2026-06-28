import { useState, useEffect } from 'react';
import api from '../api';
import { showAlert, showLoader, closeLoader, showConfirm } from '../utils/swalUtils';
import { Wallet, IndianRupee, Calendar, CheckCircle, HandCoins, User, Clock, Check, X, FileText, ChevronDown, ChevronUp, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Swal from 'sweetalert2';

export default function FundManagement() {
  const [activeTab, setActiveTab] = useState('salary'); // 'salary', 'requests', 'history'
  
  // Salary Tab State
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [summaryData, setSummaryData] = useState([]);
  const [salaryPage, setSalaryPage] = useState(1);
  const [salaryTotalPages, setSalaryTotalPages] = useState(1);

  // Requests Tab State
  const [requests, setRequests] = useState([]);
  const [requestsPage, setRequestsPage] = useState(1);
  const [requestsTotalPages, setRequestsTotalPages] = useState(1);

  // History Tab State
  const [history, setHistory] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyMonth, setHistoryMonth] = useState('');
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState('');

  // Revenue Tab State
  const [revenueData, setRevenueData] = useState([]);
  const [revenueStaffId, setRevenueStaffId] = useState('');
  const [revenueFilterType, setRevenueFilterType] = useState('month'); // 'month', 'today', 'custom'
  const [revenueMonth, setRevenueMonth] = useState(new Date().toISOString().slice(0, 7));
  const [revenueStartDate, setRevenueStartDate] = useState('');
  const [revenueEndDate, setRevenueEndDate] = useState('');
  const [revenuePage, setRevenuePage] = useState(1);
  const [revenueTotalPages, setRevenueTotalPages] = useState(1);

  // Initial Fetch Staff List for filters
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res = await api.get('/admin/staff');
        setStaffList(res.data.data || []);
      } catch (err) {
        console.error('Error fetching staff list');
      }
    };
    fetchStaff();
  }, []);

  // Fetch functions
  const fetchSummary = async (month) => {
    try {
      const res = await api.get(`/admin/funds/summary/${month}?page=${salaryPage}&limit=10`);
      setSummaryData(res.data?.data || []);
      setSalaryTotalPages(res.data?.pages || 1);
    } catch (err) {
      console.error('Error fetching fund summary');
    }
  };

  const fetchRequests = async () => {
    try {
      const res = await api.get(`/admin/funds/requests?page=${requestsPage}&limit=10`);
      setRequests(res.data?.data || []);
      setRequestsTotalPages(res.data?.pages || 1);
    } catch (err) {
      console.error('Error fetching requests');
    }
  };

  const fetchHistory = async () => {
    try {
      let url = `/admin/funds/history?page=${historyPage}&limit=10`;
      if (historyMonth) url += `&month=${historyMonth}`;
      if (selectedStaff) url += `&staff_id=${selectedStaff}`;
      const res = await api.get(url);
      setHistory(res.data?.data || []);
      setHistoryTotalPages(res.data?.pages || 1);
    } catch (err) {
      console.error('Error fetching history');
    }
  };

  const fetchRevenueReport = async () => {
    try {
      showLoader('Loading', 'Filtering revenue report...');
      let url = `/admin/funds/revenue-details?page=${revenuePage}&limit=10`;
      if (revenueStaffId) url += `&staff_id=${revenueStaffId}`;
      
      if (revenueFilterType === 'today') {
        const today = new Date().toISOString().split('T')[0];
        url += `&date=${today}`;
      } else if (revenueFilterType === 'custom' && revenueStartDate && revenueEndDate) {
        url += `&startDate=${revenueStartDate}&endDate=${revenueEndDate}`;
      } else if (revenueFilterType === 'month' && revenueMonth) {
        url += `&month=${revenueMonth}`;
      }

      const res = await api.get(url);
      setRevenueData(res.data?.data || []);
      setRevenueTotalPages(res.data?.pages || 1);
      closeLoader();
    } catch (err) {
      console.error('Error fetching revenue report');
      closeLoader();
    }
  };

  useEffect(() => {
    if (activeTab === 'salary' && selectedMonth) fetchSummary(selectedMonth);
    if (activeTab === 'requests') fetchRequests();
    if (activeTab === 'history') fetchHistory();
    if (activeTab === 'revenue') fetchRevenueReport();
  }, [activeTab, selectedMonth, historyPage, historyMonth, selectedStaff, revenueMonth, revenueStaffId, revenueFilterType, revenueStartDate, revenueEndDate, salaryPage, requestsPage, revenuePage]);



  const handlePaySalary = async (staff_id, remainingSalary) => {
    const { value: file } = await Swal.fire({
      title: 'Pay Final Salary',
      html: `
        <div class="text-left mb-4">
          <p class="text-sm text-gray-600 mb-2">You are paying the final salary of <b>₹${remainingSalary}</b> for <b>${selectedMonth}</b>.</p>
        </div>
        <div class="mt-4">
          <label class="block text-sm font-medium text-gray-700 text-left mb-1">Upload Payment Slip (Optional)</label>
          <input type="file" id="swal-salary-slip" accept="image/*,application/pdf" class="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 outline-none border border-gray-200 rounded-xl p-2 cursor-pointer" />
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Pay & Upload',
      confirmButtonColor: '#10b981',
      cancelButtonText: 'Cancel',
      preConfirm: () => {
        const fileInput = document.getElementById('swal-salary-slip');
        return fileInput.files.length > 0 ? fileInput.files[0] : null;
      }
    });

    if (file || file === null) {
      showLoader('Processing', 'Recording salary payment...');
      try {
        let slipUrl = '';
        if (file) {
          const formData = new FormData();
          formData.append('files', file);
          const uploadRes = await api.post('/upload/upload-files', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          const uploadData = uploadRes.data;
          if (uploadData.success && uploadData.urls.length > 0) {
            slipUrl = uploadData.urls[0];
          }
        }

        await api.post('/admin/pay-salary', {
          staff_id,
          month: selectedMonth,
          amount: remainingSalary,
          slipUrl
        });
        closeLoader();
        showAlert('Success', 'Salary marked as paid!', 'success');
        fetchSummary(selectedMonth);
      } catch (err) {
        closeLoader();
        showAlert('Error', 'Failed to process payment', 'error');
      }
    }
  };

  const handleGenerateReport = async (staff_id, month) => {
    try {
      showLoader('Generating Report', 'Fetching detailed data...');
      const res = await api.get(`/admin/funds/report/${month}/${staff_id}`);
      const data = res.data;
      
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(22);
      doc.setTextColor(16, 185, 129); // Emerald 500
      doc.text("Quick Service", 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text("Premium Salary & Attendance Report", 14, 30);
      doc.text(`Month: ${data.summary.month}`, 14, 35);
      
      // Staff Details
      doc.setFontSize(14);
      doc.setTextColor(40);
      doc.text("Staff Details", 14, 45);
      doc.setFontSize(10);
      doc.setTextColor(80);
      doc.text(`Name: ${data.staff.name}`, 14, 52);
      doc.text(`Email: ${data.staff.email}`, 14, 57);
      doc.text(`Base Salary: Rs. ${data.staff.baseSalary}`, 14, 62);

      // Summary Table
      autoTable(doc, {
        startY: 70,
        head: [['Total Days', 'Elapsed', 'Present', 'Absent', 'Daily Rate', 'Absent Cut', 'Advances', 'Rewards', 'Net Salary']],
        body: [[
          data.summary.totalDaysInMonth,
          data.summary.elapsedDays,
          data.summary.presentDays,
          data.summary.absentDays,
          `Rs. ${data.summary.dailySalary}`,
          `Rs. ${data.summary.totalDeduction}`,
          `Rs. ${data.summary.totalAdvance}`,
          `Rs. ${data.summary.totalReward}`,
          `Rs. ${data.summary.netSalary}`
        ]],
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129] },
        styles: { halign: 'center', fontSize: 8 }
      });

      let currentY = doc.lastAutoTable.finalY + 10;

      // Combined Attendance Log
      const combinedAttendance = [];
      for (let i = 1; i <= data.summary.elapsedDays; i++) {
         const dayStr = String(i).padStart(2, '0');
         const dateStr = `${month}-${dayStr}`;
         const record = data.attendances.find(a => a.date === dateStr);
         if (record) {
            combinedAttendance.push([dateStr, 'Present', record.start_time || 'N/A', record.end_time || 'N/A']);
         } else {
            combinedAttendance.push([dateStr, 'Absent', '-', '-']);
         }
      }

      if (combinedAttendance.length > 0) {
        doc.setFontSize(12);
        doc.setTextColor(40);
        doc.text("Daily Attendance Log", 14, currentY);
        autoTable(doc, {
          startY: currentY + 4,
          head: [['Date', 'Status', 'Start Time', 'End Time']],
          body: combinedAttendance,
          theme: 'striped',
          didParseCell: function(dataParse) {
             if (dataParse.section === 'body' && dataParse.column.index === 1) {
                if (dataParse.cell.raw === 'Absent') {
                   dataParse.cell.styles.textColor = [239, 68, 68]; // red
                   dataParse.cell.styles.fontStyle = 'bold';
                } else {
                   dataParse.cell.styles.textColor = [16, 185, 129]; // green
                   dataParse.cell.styles.fontStyle = 'bold';
                }
             }
          },
          styles: { fontSize: 8 }
        });
        currentY = doc.lastAutoTable.finalY + 10;
      }

      // Advances Log
      if (data.advances && data.advances.length > 0) {
        if (currentY > 250) { doc.addPage(); currentY = 20; }
        doc.setFontSize(12);
        doc.setTextColor(40);
        doc.text("Advances Log", 14, currentY);
        autoTable(doc, {
          startY: currentY + 4,
          head: [['Date', 'Amount', 'Description']],
          body: data.advances.map(a => [a.date, `Rs. ${a.amount}`, a.description || 'N/A']),
          theme: 'striped',
          styles: { fontSize: 8 }
        });
        currentY = doc.lastAutoTable.finalY + 10;
      }

      // Rewards Log
      if (data.rewards && data.rewards.length > 0) {
        if (currentY > 250) { doc.addPage(); currentY = 20; }
        doc.setFontSize(12);
        doc.setTextColor(40);
        doc.text("Rewards Log", 14, currentY);
        autoTable(doc, {
          startY: currentY + 4,
          head: [['Date', 'Amount', 'Task']],
          body: data.rewards.map(r => [r.date, `Rs. ${r.amount}`, r.title || 'N/A']),
          theme: 'striped',
          styles: { fontSize: 8 }
        });
        currentY = doc.lastAutoTable.finalY + 10;
      }

      // Final Settlement Details
      if (currentY > 220) { doc.addPage(); currentY = 20; }
      
      doc.setFontSize(14);
      doc.setTextColor(40);
      doc.setFont("helvetica", "bold");
      doc.text("Final Settlement Details", 14, currentY);
      
      currentY += 8;
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`Total Base Salary: Rs. ${data.staff.baseSalary}`, 14, currentY);
      currentY += 6;
      doc.text(`Total Rewards: + Rs. ${data.summary.totalReward}`, 14, currentY);
      currentY += 6;
      doc.text(`Total Advance Taken: - Rs. ${data.summary.totalAdvance}`, 14, currentY);
      currentY += 6;
      doc.text(`Absent Deductions: - Rs. ${data.summary.totalDeduction}`, 14, currentY);
      
      currentY += 10;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(16, 185, 129); // emerald
      doc.text(`Total Payable Amount: Rs. ${data.summary.netSalary}`, 14, currentY);
      
      currentY += 30;
      if (currentY > 270) { doc.addPage(); currentY = 20; }
      doc.setFontSize(12);
      doc.setTextColor(40);
      doc.setFont("helvetica", "normal");
      doc.text("_________________________", 14, currentY);
      doc.text("Staff Signature", 14, currentY + 6);
      
      doc.text("_________________________", 130, currentY);
      doc.text("Admin Signature", 130, currentY + 6);

      doc.save(`${data.staff.name.replace(/ /g, '_')}_Salary_Report_${month}.pdf`);
      closeLoader();
    } catch (err) {
      console.error(err);
      closeLoader();
      showAlert('Error', 'Failed to generate report', 'error');
    }
  };

  // Requests Tab Handlers
  const handleApproveRequest = async (request) => {
    const { value: file } = await Swal.fire({
      title: 'Approve Advance',
      html: `
        <div class="text-left mb-4">
          <p class="text-sm text-gray-600 mb-2">You are approving <b>₹${request.amount}</b> for <b>${request.name}</b>.</p>
          <p class="text-sm text-gray-600 mb-2">Reason: ${request.description}</p>
        </div>
        <div class="mt-4">
          <label class="block text-sm font-medium text-gray-700 text-left mb-1">Upload Payment Slip (Optional)</label>
          <input type="file" id="swal-slip-file" accept="image/*,application/pdf" class="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 outline-none border border-gray-200 rounded-xl p-2 cursor-pointer" />
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Approve Request',
      confirmButtonColor: '#10b981',
      cancelButtonText: 'Cancel',
      preConfirm: () => {
        const fileInput = document.getElementById('swal-slip-file');
        return fileInput.files.length > 0 ? fileInput.files[0] : null;
      }
    });

    if (file || file === null) {
      showLoader('Approving', 'Processing request...');
      try {
        let slipUrl = '';
        if (file) {
          const formData = new FormData();
          formData.append('files', file);
          const uploadRes = await api.post('/upload/upload-files', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          const uploadData = uploadRes.data;
          if (uploadData.success && uploadData.urls.length > 0) {
            slipUrl = uploadData.urls[0];
          }
        }

        await api.put(`/admin/funds/request/${request.id}`, { status: 'approved', slipUrl });
        closeLoader();
        Swal.fire('Approved!', 'The advance request has been approved.', 'success');
        fetchRequests();
      } catch (err) {
        closeLoader();
        Swal.fire('Error', 'Failed to approve request', 'error');
      }
    }
  };

  const handleRejectRequest = async (requestId) => {
    const confirmed = await showConfirm('Reject Request', 'Are you sure you want to reject this advance request?', 'Yes, Reject', 'warning');
    if (confirmed) {
      try {
        await api.put(`/admin/funds/request/${requestId}`, { status: 'rejected' });
        fetchRequests();
        Swal.fire('Rejected', 'Request rejected', 'success');
      } catch (err) {
        Swal.fire('Error', 'Failed to reject request', 'error');
      }
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved': return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">Approved</span>;
      case 'rejected': return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">Rejected</span>;
      case 'pending': default: return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">Pending</span>;
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-800 to-emerald-600 p-8 rounded-2xl shadow-lg text-white">
        <h2 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-2">
          <Wallet size={28} /> Financial Management
        </h2>
        <p className="text-emerald-100 mb-6">Manage monthly salaries, approve advance requests, and view payment history.</p>
        
        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b border-emerald-500/30 pb-0">
          <button 
            onClick={() => setActiveTab('salary')}
            className={`px-6 py-3 font-semibold text-sm rounded-t-lg transition-colors ${activeTab === 'salary' ? 'bg-white text-emerald-800' : 'text-emerald-100 hover:bg-emerald-700 hover:text-white'}`}
          >
            Salary Overview
          </button>
          <button 
            onClick={() => setActiveTab('requests')}
            className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm rounded-t-lg transition-colors ${activeTab === 'requests' ? 'bg-white text-emerald-800' : 'text-emerald-100 hover:bg-emerald-700 hover:text-white'}`}
          >
            Advance Requests
            {requests.length > 0 && <span className="bg-amber-400 text-emerald-900 px-2 py-0.5 rounded-full text-xs">{requests.length}</span>}
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`px-6 py-3 font-semibold text-sm rounded-t-lg transition-colors ${activeTab === 'history' ? 'bg-white text-emerald-800' : 'text-emerald-100 hover:bg-emerald-700 hover:text-white'}`}
          >
            Advance History
          </button>
          <button 
            onClick={() => setActiveTab('revenue')}
            className={`px-6 py-3 font-semibold text-sm rounded-t-lg transition-colors ${activeTab === 'revenue' ? 'bg-white text-emerald-800' : 'text-emerald-100 hover:bg-emerald-700 hover:text-white'}`}
          >
            Revenue Report
          </button>
        </div>
      </div>

      {/* SALARY OVERVIEW TAB */}
      {activeTab === 'salary' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in duration-300">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h3 className="text-xl font-bold text-gray-800">Payment Breakdown</h3>
            <div className="bg-white px-4 py-2 border border-gray-200 rounded-xl shadow-sm flex items-center gap-3">
              <Calendar size={20} className="text-emerald-600" />
              <input 
                type="month" 
                value={selectedMonth}
                onChange={(e) => {setSelectedMonth(e.target.value); setSalaryPage(1);}}
                className="bg-transparent text-gray-800 font-bold outline-none cursor-pointer"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-sm tracking-wider uppercase">
                  <th className="p-5 font-semibold border-b border-gray-200">Staff</th>
                  <th className="p-5 font-semibold border-b border-gray-200 text-right">Base Salary</th>
                  <th className="p-5 font-semibold border-b border-gray-200 text-right">Absent Cut</th>
                  <th className="p-5 font-semibold border-b border-gray-200 text-right">Advance</th>
                  <th className="p-5 font-semibold border-b border-gray-200 text-right">Reward</th>
                  <th className="p-5 font-semibold border-b border-gray-200 text-right">Remaining</th>
                  <th className="p-5 font-semibold border-b border-gray-200 text-center">Status</th>
                  <th className="p-5 font-semibold border-b border-gray-200 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {summaryData?.map((data) => (
                  <tr key={data.staff_id} className="hover:bg-emerald-50/30 transition-colors">
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        {data.pic ? (
                          <img src={data.pic} alt={data.name} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                            <User size={18} />
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-gray-800">{data.name}</p>
                          <p className="text-xs text-gray-500">{data.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-5 text-right font-medium text-gray-600">₹{data.baseSalary}</td>
                    <td className="p-5 text-right font-medium text-red-500">- ₹{data.totalDeduction}</td>
                    <td className="p-5 text-right font-medium text-red-500">- ₹{data.totalAdvance}</td>
                    <td className="p-5 text-right font-medium text-emerald-500">+ ₹{data.totalReward}</td>
                    <td className="p-5 text-right font-bold text-gray-800 text-lg">₹{data.remainingSalary}</td>
                    <td className="p-5 text-center">
                      {data.isPaid ? (
                        <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                          <CheckCircle size={14} /> Paid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="p-5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleGenerateReport(data.staff_id, selectedMonth)}
                          className="flex items-center gap-1 bg-amber-500 text-white hover:bg-amber-600 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors shadow-sm shadow-amber-200 cursor-pointer"
                          title="Generate Report"
                        >
                          <Download size={16} /> Report
                        </button>
                        {!data.isPaid ? (
                          <button 
                            onClick={() => handlePaySalary(data.staff_id, data.remainingSalary)}
                            className="flex items-center gap-1 bg-emerald-600 text-white hover:bg-emerald-700 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors shadow-sm shadow-emerald-200 cursor-pointer"
                          >
                            <IndianRupee size={16} /> Pay
                          </button>
                        ) : (
                          <span className="text-sm font-medium text-gray-400 italic px-3 py-1.5">Settled</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {(!summaryData || summaryData.length === 0) && (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-gray-500">No staff records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {salaryTotalPages > 1 && (
            <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-gray-50">
              <span className="text-sm text-gray-600">Page <b>{salaryPage}</b> of <b>{salaryTotalPages}</b></span>
              <div className="flex gap-2">
                <button 
                  disabled={salaryPage === 1}
                  onClick={() => setSalaryPage(p => p - 1)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium bg-white hover:bg-gray-100 disabled:opacity-50 transition-colors"
                >
                  Previous
                </button>
                <button 
                  disabled={salaryPage === salaryTotalPages}
                  onClick={() => setSalaryPage(p => p + 1)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium bg-white hover:bg-gray-100 disabled:opacity-50 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ADVANCE REQUESTS TAB */}
      {activeTab === 'requests' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in duration-300">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-xl font-bold text-gray-800">Pending Advance Requests</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-sm tracking-wider uppercase border-b border-gray-200">
                  <th className="p-5 font-semibold">Staff</th>
                  <th className="p-5 font-semibold">Date Requested</th>
                  <th className="p-5 font-semibold">Reason</th>
                  <th className="p-5 font-semibold text-right">Amount</th>
                  <th className="p-5 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-amber-50/30 transition-colors">
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        {req.pic ? (
                          <img src={req.pic} alt={req.name} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                            <User size={18} />
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-gray-800">{req.name}</p>
                          <p className="text-xs text-gray-500">{req.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-5 text-gray-600 font-medium">{req.date}</td>
                    <td className="p-5 text-gray-600 max-w-xs truncate" title={req.description}>{req.description}</td>
                    <td className="p-5 text-right font-bold text-red-600 text-lg">₹{req.amount}</td>
                    <td className="p-5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleApproveRequest(req)} className="p-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors" title="Approve Request">
                          <Check size={18} strokeWidth={3} />
                        </button>
                        <button onClick={() => handleRejectRequest(req.id)} className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors" title="Reject Request">
                          <X size={18} strokeWidth={3} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(!requests || requests.length === 0) && (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-gray-500">No pending advance requests.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {requestsTotalPages > 1 && (
            <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-gray-50">
              <span className="text-sm text-gray-600">Page <b>{requestsPage}</b> of <b>{requestsTotalPages}</b></span>
              <div className="flex gap-2">
                <button 
                  disabled={requestsPage === 1}
                  onClick={() => setRequestsPage(p => p - 1)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium bg-white hover:bg-gray-100 disabled:opacity-50 transition-colors"
                >
                  Previous
                </button>
                <button 
                  disabled={requestsPage === requestsTotalPages}
                  onClick={() => setRequestsPage(p => p + 1)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium bg-white hover:bg-gray-100 disabled:opacity-50 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ADVANCE HISTORY TAB */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in duration-300">
          <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50/50">
            <h3 className="text-xl font-bold text-gray-800">Advance History</h3>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <select 
                value={selectedStaff} 
                onChange={(e) => {setSelectedStaff(e.target.value); setHistoryPage(1);}}
                className="px-4 py-2 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="">All Staff</option>
                {staffList.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
              <input 
                type="month" 
                value={historyMonth}
                onChange={(e) => {setHistoryMonth(e.target.value); setHistoryPage(1);}}
                className="px-4 py-2 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
              <button onClick={() => {setHistoryMonth(''); setSelectedStaff(''); setHistoryPage(1);}} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-xl border border-gray-300 font-medium transition-colors">
                Clear Filters
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-sm tracking-wider uppercase border-b border-gray-200">
                  <th className="p-5 font-semibold">Staff</th>
                  <th className="p-5 font-semibold">Date</th>
                  <th className="p-5 font-semibold">Description</th>
                  <th className="p-5 font-semibold">Status</th>
                  <th className="p-5 font-semibold">Slip</th>
                  <th className="p-5 font-semibold text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        {item.pic ? (
                          <img src={item.pic} alt={item.name} className="w-8 h-8 rounded-full object-cover border border-gray-200" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs">
                            <User size={14} />
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-gray-800 text-sm">{item.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-5 text-gray-600 text-sm">{item.date}</td>
                    <td className="p-5 text-gray-600 text-sm max-w-xs truncate" title={item.description}>
                      {item.type === 'salary' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 uppercase tracking-wider mr-2 border border-indigo-200">
                          Salary
                        </span>
                      )}
                      {item.description}
                    </td>
                    <td className="p-5">{getStatusBadge(item.status)}</td>
                    <td className="p-5">
                      {item.slipUrl ? (
                        <a href={item.slipUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors">
                          <FileText size={16} /> View Slip
                        </a>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="p-5 text-right font-bold text-gray-800">₹{item.amount}</td>
                  </tr>
                ))}
                {(!history || history.length === 0) && (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-gray-500">No history found for the selected filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {historyTotalPages > 1 && (
            <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-gray-50">
              <span className="text-sm text-gray-600">Page <b>{historyPage}</b> of <b>{historyTotalPages}</b></span>
              <div className="flex gap-2">
                <button 
                  disabled={historyPage === 1}
                  onClick={() => setHistoryPage(p => p - 1)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium bg-white hover:bg-gray-100 disabled:opacity-50 transition-colors"
                >
                  Previous
                </button>
                <button 
                  disabled={historyPage === historyTotalPages}
                  onClick={() => setHistoryPage(p => p + 1)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium bg-white hover:bg-gray-100 disabled:opacity-50 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* REVENUE REPORT TAB */}
      {activeTab === 'revenue' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in duration-300">
          <div className="p-6 border-b border-gray-100 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-gray-50/50">
            <h3 className="text-xl font-bold text-gray-800 whitespace-nowrap">Detailed Revenue Report</h3>
            <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
              <select 
                value={revenueStaffId} 
                onChange={(e) => {setRevenueStaffId(e.target.value); setRevenuePage(1);}}
                className="px-4 py-2 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="">All Staff</option>
                {staffList.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>

              <select 
                value={revenueFilterType} 
                onChange={(e) => {setRevenueFilterType(e.target.value); setRevenuePage(1);}}
                className="px-4 py-2 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="month">Monthly</option>
                <option value="today">Today</option>
                <option value="custom">Date Range</option>
              </select>

              {revenueFilterType === 'month' && (
                <div className="bg-white px-3 py-1.5 border border-gray-300 rounded-xl flex items-center gap-2">
                  <Calendar size={18} className="text-emerald-600" />
                  <input 
                    type="month" 
                    value={revenueMonth}
                    onChange={(e) => {setRevenueMonth(e.target.value); setRevenuePage(1);}}
                    className="bg-transparent text-gray-800 font-medium outline-none cursor-pointer text-sm"
                  />
                </div>
              )}

              {revenueFilterType === 'custom' && (
                <div className="flex items-center gap-2">
                  <input 
                    type="date" 
                    value={revenueStartDate}
                    onChange={(e) => {setRevenueStartDate(e.target.value); setRevenuePage(1);}}
                    className="px-3 py-1.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                  />
                  <span className="text-gray-500 font-medium">to</span>
                  <input 
                    type="date" 
                    value={revenueEndDate}
                    onChange={(e) => {setRevenueEndDate(e.target.value); setRevenuePage(1);}}
                    className="px-3 py-1.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                  />
                </div>
              )}

              <button 
                onClick={() => {
                  setRevenueStaffId('');
                  setRevenueFilterType('month');
                  setRevenueMonth(new Date().toISOString().slice(0, 7));
                  setRevenueStartDate('');
                  setRevenueEndDate('');
                  setRevenuePage(1);
                }} 
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-xl border border-gray-300 font-medium transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-sm tracking-wider uppercase">
                  <th className="p-5 font-semibold border-b border-gray-200">Staff Name</th>
                  <th className="p-5 font-semibold border-b border-gray-200">Customer Name</th>
                  <th className="p-5 font-semibold border-b border-gray-200">Mobile No.</th>
                  <th className="p-5 font-semibold border-b border-gray-200">Payment Date</th>
                  <th className="p-5 font-semibold border-b border-gray-200 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {revenueData.map((data) => (
                  <tr key={data.id} className="hover:emerald-50/30 transition-colors">
                    <td className="p-5 font-bold text-gray-800">{data.staffName}</td>
                    <td className="p-5 font-medium text-gray-600">{data.customerName}</td>
                    <td className="p-5 font-medium text-gray-600">{data.customerMobile}</td>
                    <td className="p-5 text-gray-600">{data.date}</td>
                    <td className="p-5 text-right font-bold text-emerald-600 text-lg">₹{data.amount}</td>
                  </tr>
                ))}
                {(!revenueData || revenueData.length === 0) && (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-gray-500">No revenue data found for this month.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {revenueTotalPages > 1 && (
            <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-gray-50">
              <span className="text-sm text-gray-600">Page <b>{revenuePage}</b> of <b>{revenueTotalPages}</b></span>
              <div className="flex gap-2">
                <button 
                  disabled={revenuePage === 1}
                  onClick={() => setRevenuePage(p => p - 1)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium bg-white hover:bg-gray-100 disabled:opacity-50 transition-colors"
                >
                  Previous
                </button>
                <button 
                  disabled={revenuePage === revenueTotalPages}
                  onClick={() => setRevenuePage(p => p + 1)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium bg-white hover:bg-gray-100 disabled:opacity-50 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
