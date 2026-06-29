import { useState, useEffect } from 'react';
import api from '../api';
import { IndianRupee, History, Wallet, PlusCircle, CheckCircle, Clock, XCircle, FileText, Download } from 'lucide-react';
import Swal from 'sweetalert2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function FundsViewer() {
  const [data, setData] = useState({ salary: 0, baseSalary: 0, totalRewards: 0, totalTaken: 0, remaining: 0, funds: [] });
  const [showModal, setShowModal] = useState(false);
  const [requestData, setRequestData] = useState({ amount: '', description: '' });
  const [selectedMonth, setSelectedMonth] = useState('');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchFunds = async () => {
    try {
      const url = selectedMonth ? `/staff/funds?month=${selectedMonth}` : '/staff/funds';
      const res = await api.get(url);
      setData(res.data);
    } catch (err) {
      console.error('Error fetching funds');
    }
  };

  useEffect(() => {
    fetchFunds();
  }, [selectedMonth]);

  const handleRequest = async (e) => {
    e.preventDefault();
    if (!requestData.amount || requestData.amount <= 0) return Swal.fire('Error', 'Invalid amount', 'error');
    if (requestData.amount > data.remaining) return Swal.fire('Error', 'Amount exceeds remaining salary', 'error');

    try {
      await api.post('/staff/funds/request', {
        amount: Number(requestData.amount),
        description: requestData.description,
        date: new Date().toISOString().split('T')[0]
      });
      setShowModal(false);
      setRequestData({ amount: '', description: '' });
      Swal.fire('Success', 'Advance request submitted successfully', 'success');
      fetchFunds();
    } catch (err) {
      Swal.fire('Error', 'Failed to submit request', 'error');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700"><CheckCircle size={12} /> Approved</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700"><XCircle size={12} /> Rejected</span>;
      case 'pending':
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700"><Clock size={12} /> Pending</span>;
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedMonth) {
      return Swal.fire('Error', 'Please select a month to generate report', 'error');
    }
    try {
      Swal.fire({ title: 'Generating Report', text: 'Fetching detailed data...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
      const res = await api.get(`/staff/funds/report/${selectedMonth}`);
      const reportData = res.data;
      
      if (!reportData || typeof reportData === 'string' || !reportData.summary) {
         console.error('Invalid report data received:', reportData);
         Swal.fire('Error', 'Invalid data received from server. Please try again.', 'error');
         return;
      }
      
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(22);
      doc.setTextColor(16, 185, 129); // Emerald 500
      doc.text("Quick Service", 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text("Premium Salary & Attendance Report", 14, 30);
      doc.text(`Month: ${reportData.summary.month}`, 14, 35);
      
      // Staff Details
      doc.setFontSize(14);
      doc.setTextColor(40);
      doc.text("Staff Details", 14, 45);
      doc.setFontSize(10);
      doc.setTextColor(80);
      doc.text(`Name: ${reportData.staff.name}`, 14, 52);
      doc.text(`Email: ${reportData.staff.email}`, 14, 57);
      doc.text(`Base Salary: Rs. ${reportData.staff.baseSalary}`, 14, 62);

      // Summary Table
      autoTable(doc, {
        startY: 70,
        head: [['Total Days', 'Elapsed', 'Present', 'Absent', 'Daily Rate', 'Absent Cut', 'Advances', 'Rewards', 'Net Salary']],
        body: [[
          reportData.summary.totalDaysInMonth,
          reportData.summary.elapsedDays,
          reportData.summary.presentDays,
          reportData.summary.absentDays,
          `Rs. ${reportData.summary.dailySalary}`,
          `Rs. ${reportData.summary.totalDeduction}`,
          `Rs. ${reportData.summary.totalAdvance}`,
          `Rs. ${reportData.summary.totalReward}`,
          `Rs. ${reportData.summary.netSalary}`
        ]],
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129] },
        styles: { halign: 'center', fontSize: 8 }
      });

      let currentY = doc.lastAutoTable.finalY + 10;

      // Combined Attendance Log
      const combinedAttendance = [];
      for (let i = 1; i <= reportData.summary.elapsedDays; i++) {
         const dayStr = String(i).padStart(2, '0');
         const dateStr = `${selectedMonth}-${dayStr}`;
         const record = reportData.attendances.find(a => a.date === dateStr);
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
      if (reportData.advances && reportData.advances.length > 0) {
        if (currentY > 250) { doc.addPage(); currentY = 20; }
        doc.setFontSize(12);
        doc.setTextColor(40);
        doc.text("Advances Log", 14, currentY);
        autoTable(doc, {
          startY: currentY + 4,
          head: [['Date', 'Amount', 'Description']],
          body: reportData.advances.map(a => [a.date, `Rs. ${a.amount}`, a.description || 'N/A']),
          theme: 'striped',
          styles: { fontSize: 8 }
        });
        currentY = doc.lastAutoTable.finalY + 10;
      }

      // Rewards Log
      if (reportData.rewards && reportData.rewards.length > 0) {
        if (currentY > 250) { doc.addPage(); currentY = 20; }
        doc.setFontSize(12);
        doc.setTextColor(40);
        doc.text("Rewards Log", 14, currentY);
        autoTable(doc, {
          startY: currentY + 4,
          head: [['Date', 'Amount', 'Task']],
          body: reportData.rewards.map(r => [r.date, `Rs. ${r.amount}`, r.title || 'N/A']),
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
      doc.text(`Total Base Salary: Rs. ${reportData.staff.baseSalary}`, 14, currentY);
      currentY += 6;
      doc.text(`Total Rewards: + Rs. ${reportData.summary.totalReward}`, 14, currentY);
      currentY += 6;
      doc.text(`Total Advance Taken: - Rs. ${reportData.summary.totalAdvance}`, 14, currentY);
      currentY += 6;
      doc.text(`Absent Deductions: - Rs. ${reportData.summary.totalDeduction}`, 14, currentY);
      
      currentY += 10;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(16, 185, 129); // emerald
      doc.text(`Total Payable Amount: Rs. ${reportData.summary.netSalary}`, 14, currentY);
      
      currentY += 30;
      if (currentY > 270) { doc.addPage(); currentY = 20; }
      doc.setFontSize(12);
      doc.setTextColor(40);
      doc.setFont("helvetica", "normal");
      doc.text("_________________________", 14, currentY);
      doc.text("Staff Signature", 14, currentY + 6);
      
      doc.text("_________________________", 130, currentY);
      doc.text("Admin Signature", 130, currentY + 6);

      doc.save(`${reportData.staff.name.replace(/ /g, '_')}_Salary_Report_${selectedMonth}.pdf`);
      Swal.close();
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Failed to generate report', 'error');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white p-8 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-2">Good {new Date().getHours() < 12 ? 'Morning' : 'Afternoon'}, {user.name}!</h2>
          <p className="text-emerald-100 max-w-xl">
            Here you can track your base salary, view any advanced funds taken, and monitor your remaining balance for the month.
          </p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="relative z-10 flex items-center gap-2 bg-white text-emerald-700 px-5 py-2.5 rounded-xl font-bold hover:bg-emerald-50 transition-colors shadow-sm"
        >
          <PlusCircle size={20} /> Request Advance
        </button>
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white opacity-10 blur-2xl"></div>
        <div className="absolute bottom-0 right-32 w-32 h-32 rounded-full bg-emerald-400 opacity-20 blur-xl"></div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
            <Wallet size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Base Salary</p>
            <p className="text-2xl font-bold text-gray-800">₹{data.baseSalary}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Rewards</p>
            <p className="text-2xl font-bold text-emerald-600">+ ₹{data.totalRewards}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
            <IndianRupee size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Taken (Advances)</p>
            <p className="text-2xl font-bold text-red-600">₹{data.totalTaken}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-500 flex items-center gap-4 shadow-emerald-100/50">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
            <IndianRupee size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-emerald-800">Remaining Balance</p>
            <p className="text-3xl font-bold text-emerald-600">₹{data.remaining}</p>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <History size={20} className="text-emerald-600" />
            Advance & Salary History
          </h2>
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <label className="text-sm font-medium text-gray-500 whitespace-nowrap">Filter Month:</label>
            <input 
              type="month" 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none flex-grow md:flex-grow-0"
            />
            {selectedMonth && (
              <>
                <button 
                  onClick={handleGenerateReport}
                  className="flex items-center gap-1 bg-emerald-600 text-white px-3 py-2 rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors whitespace-nowrap"
                >
                  <Download size={16} /> Report
                </button>
                <button 
                  onClick={() => setSelectedMonth('')}
                  className="text-sm text-gray-500 hover:text-gray-700 underline whitespace-nowrap"
                >
                  Clear
                </button>
              </>
            )}
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-y border-gray-200 text-gray-600 text-sm">
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Description</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Slip</th>
                <th className="p-4 font-medium text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {data.funds.map((fund) => (
                <tr key={fund.id || fund._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="p-4 text-sm text-gray-500">{fund.date}</td>
                  <td className="p-4 text-gray-800">
                    {fund.type === 'salary' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 uppercase tracking-wider mr-2 border border-indigo-200">
                        Salary
                      </span>
                    )}
                    {fund.type === 'reward' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 uppercase tracking-wider mr-2 border border-emerald-200">
                        Reward
                      </span>
                    )}
                    {fund.description || '-'}
                  </td>
                  <td className="p-4">{getStatusBadge(fund.status)}</td>
                  <td className="p-4 text-sm">
                    {fund.slipUrl ? (
                      <a href={fund.slipUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline font-medium">
                        <FileText size={16} /> View
                      </a>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className={`p-4 font-bold text-right ${
                    fund.type === 'reward' ? 'text-emerald-600' :
                    fund.status === 'approved' ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {fund.type === 'reward' ? '+ ' : fund.status === 'approved' ? '- ' : ''}₹{fund.amount}
                  </td>
                </tr>
              ))}
              {data.funds.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-500">No requests or funds have been recorded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Request Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-emerald-600 p-4 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg">Request Advance Payment</h3>
            </div>
            <form onSubmit={handleRequest} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                <input 
                  type="number" 
                  max={data.remaining}
                  required
                  value={requestData.amount}
                  onChange={(e) => setRequestData({...requestData, amount: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder={`Max: ₹${data.remaining}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason / Description</label>
                <textarea 
                  required
                  rows="3"
                  value={requestData.description}
                  onChange={(e) => setRequestData({...requestData, description: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                  placeholder="Why do you need this advance?"
                ></textarea>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-200">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
