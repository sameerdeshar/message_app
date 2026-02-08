import { useState, useEffect } from 'react';
import {
    useGetTablesQuery,
    useGetTableSchemaQuery,
    useGetTableDataQuery,
    useInsertRowMutation,
    useUpdateRowMutation,
    useDeleteRowMutation,
    useExecuteQueryMutation,
    useGetMediaQuery,
    useDeleteMediaMutation
} from '../features/database/databaseApi';
import Toast from '../components/Toast';
import {
    Database,
    Table,
    Plus,
    Trash2,
    Edit,
    Play,
    Download,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    ChevronDown,
    Code,
    X,
    Image as ImageIcon,
    FileText
} from 'lucide-react';

const DatabaseViewer = () => {
    const [selectedTable, setSelectedTable] = useState(null);
    const [viewMode, setViewMode] = useState('tables'); // 'tables' or 'media'
    const [page, setPage] = useState(1);
    const [sortOrder, setSortOrder] = useState('DESC');
    const [sortColumn, setSortColumn] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showSqlModal, setShowSqlModal] = useState(false);
    const [editingRow, setEditingRow] = useState(null);
    const [deletingRow, setDeletingRow] = useState(null);
    const [formData, setFormData] = useState({});
    const [sqlQuery, setSqlQuery] = useState('');
    const [sqlResults, setSqlResults] = useState(null);
    const [toast, setToast] = useState(null);

    // Queries
    const { data: tablesData, isLoading: tablesLoading } = useGetTablesQuery();
    const { data: schemaData } = useGetTableSchemaQuery(selectedTable, {
        skip: !selectedTable || viewMode !== 'tables'
    });


    // Effect to set initial sort column based on schema
    useEffect(() => {
        if (selectedTable && schemaData?.schema) {
            // Find primary key
            const pk = schemaData.schema.find(col => col.Key === 'PRI')?.Field;
            if (pk) {
                setSortColumn(pk);
            } else {
                setSortColumn(null); // No sorting for tables without PK
            }
        }
    }, [selectedTable, schemaData]);

    const { data: tableData, isLoading: dataLoading } = useGetTableDataQuery(
        { tableName: selectedTable, page, limit: 50, sortColumn, sortOrder },
        { skip: !selectedTable || viewMode !== 'tables' }
    );
    const { data: mediaData, isLoading: mediaLoading } = useGetMediaQuery(undefined, {
        skip: viewMode !== 'media'
    });

    // Mutations
    const [insertRow] = useInsertRowMutation();
    const [updateRow] = useUpdateRowMutation();
    const [deleteRow] = useDeleteRowMutation();
    const [executeQuery] = useExecuteQueryMutation();
    const [deleteMedia] = useDeleteMediaMutation();

    const tables = tablesData?.tables || [];
    const schema = schemaData?.schema || [];
    const rows = tableData?.data || [];
    const pagination = tableData?.pagination || {};

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
    };

    const closeToast = () => setToast(null);

    const handleTableSelect = (tableName) => {
        setSelectedTable(tableName);
        setViewMode('tables');
        setPage(1);
        setSqlResults(null);
    };

    const handleDeleteMedia = async (filename) => {
        if (!window.confirm(`Are you sure you want to delete ${filename}?`)) return;
        try {
            await deleteMedia(filename).unwrap();
            showToast('File deleted successfully');
        } catch (err) {
            showToast(err.data?.error || 'Failed to delete file', 'error');
        }
    };

    const handleAddRow = async (e) => {
        e.preventDefault();
        try {
            await insertRow({ tableName: selectedTable, data: formData }).unwrap();
            showToast('Row added successfully');
            setShowAddModal(false);
            setFormData({});
        } catch (err) {
            showToast(err.data?.error || 'Failed to add row', 'error');
        }
    };

    const handleUpdateRow = async (e) => {
        e.preventDefault();
        if (!editingRow) return;

        // Find ID column
        const idKey = Object.keys(editingRow).find(k => k.toLowerCase() === 'id') ||
            (schema.find(col => col.Key === 'PRI')?.Field) ||
            Object.keys(editingRow)[0];
        const rowId = editingRow[idKey];

        // Prepare updates (exclude the primary key column itself from the SET clause)
        const updates = { ...formData };
        delete updates[idKey];

        try {
            await updateRow({
                tableName: selectedTable,
                id: rowId,
                data: updates
            }).unwrap();
            showToast('Row updated successfully');
            setShowEditModal(false);
            setEditingRow(null);
            setFormData({});
        } catch (err) {
            showToast(err.data?.error || 'Failed to update row', 'error');
        }
    };

    const handleDeleteRow = async () => {
        if (!deletingRow) return;

        // Find ID column (handle id or table_id or first column if none)
        const idKey = Object.keys(deletingRow).find(k => k.toLowerCase() === 'id') ||
            (schema.find(col => col.Key === 'PRI')?.Field) ||
            Object.keys(deletingRow)[0];
        const rowId = deletingRow[idKey];

        try {
            await deleteRow({
                tableName: selectedTable,
                id: rowId
            }).unwrap();
            showToast('Row deleted successfully');
            setShowDeleteModal(false);
            setDeletingRow(null);
        } catch (err) {
            showToast(err.data?.error || 'Failed to delete row', 'error');
        }
    };

    const handleExecuteQuery = async () => {
        try {
            const result = await executeQuery({ query: sqlQuery }).unwrap();
            setSqlResults(result);
            showToast(result.message || 'Query executed successfully');
        } catch (err) {
            if (err.data?.requiresConfirmation) {
                if (window.confirm(err.data.warning)) {
                    const result = await executeQuery({ query: sqlQuery, confirmed: true }).unwrap();
                    setSqlResults(result);
                    showToast(result.message || 'Query executed successfully');
                }
            } else {
                showToast(err.data?.error || err.data?.sqlMessage || 'Query failed', 'error');
            }
        }
    };

    const openAddModal = () => {
        const initialData = {};
        schema.forEach(col => {
            if (col.Field !== 'id' && !col.Extra.includes('auto_increment')) {
                initialData[col.Field] = '';
            }
        });
        setFormData(initialData);
        setShowAddModal(true);
    };

    const openEditModal = (row) => {
        const editData = { ...row };
        // Don't remove ID here, we need it to identify the row, but we'll exclude it from the form
        setEditingRow(row);
        setFormData(editData);
        setShowEditModal(true);
    };

    const openDeleteModal = (row) => {
        setDeletingRow(row);
        setShowDeleteModal(true);
    };

    const exportToCSV = () => {
        if (rows.length === 0) return;

        const headers = Object.keys(rows[0]).join(',');
        const csvRows = rows.map(row =>
            Object.values(row).map(val => `"${val}"`).join(',')
        );
        const csv = [headers, ...csvRows].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedTable}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        showToast('Data exported successfully');
    };

    return (
        <div className="flex h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
            {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}

            {/* Tables Sidebar */}
            <div className="w-72 bg-white border-r shadow-lg flex flex-col">
                <div className="p-5 bg-gradient-to-r from-indigo-600 to-purple-600">
                    <div className="flex items-center gap-3 text-white">
                        <Database className="w-7 h-7" />
                        <div>
                            <h2 className="text-xl font-bold">Database Manager</h2>
                            <p className="text-xs text-indigo-100">Admin Panel</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    <button
                        onClick={() => { setViewMode('media'); setSelectedTable(null); }}
                        className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between mb-4 ${viewMode === 'media'
                            ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-md'
                            : 'hover:bg-gray-100 text-gray-700 border border-dashed border-gray-300'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <ImageIcon className="w-4 h-4" />
                            <span className="font-bold text-sm">Media Library</span>
                        </div>
                        {mediaData?.files && (
                            <span className={`text-xs px-2 py-1 rounded-full ${viewMode === 'media'
                                ? 'bg-white/20 text-white'
                                : 'bg-rose-100 text-rose-600'
                                }`}>
                                {mediaData.files.length}
                            </span>
                        )}
                    </button>

                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2 mb-2 flex items-center gap-2">
                        <Table className="w-3 h-3" /> Tables
                    </div>

                    {tablesLoading ? (
                        <div className="text-center text-gray-500 py-8">Loading tables...</div>
                    ) : (
                        tables.map(table => (
                            <button
                                key={table.name}
                                onClick={() => handleTableSelect(table.name)}
                                className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between ${selectedTable === table.name
                                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                                    : 'hover:bg-gray-100 text-gray-700'
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <Table className="w-4 h-4" />
                                    <span className="font-medium text-sm">{table.name}</span>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full ${selectedTable === table.name
                                    ? 'bg-white/20 text-white'
                                    : 'bg-gray-200 text-gray-600'
                                    }`}>
                                    {table.rowCount}
                                </span>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {viewMode === 'media' ? (
                    <>
                        <div className="bg-white border-b px-6 py-4 shadow-sm">
                            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                                <ImageIcon className="w-6 h-6 text-rose-500" />
                                Media Library
                            </h1>
                            <p className="text-sm text-gray-500">Manage all uploaded image attachments</p>
                        </div>
                        <div className="flex-1 overflow-auto p-6 bg-white/50">
                            {mediaLoading ? (
                                <div className="text-center py-12">Loading media...</div>
                            ) : !mediaData?.files || mediaData.files.length === 0 ? (
                                <div className="text-center py-12 text-gray-400">No media files found.</div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                                    {mediaData.files.map(file => (
                                        <div key={file.name} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-md transition-all">
                                            <div className="aspect-square relative flex items-center justify-center bg-gray-50 overflow-hidden">
                                                <img
                                                    src={file.url}
                                                    alt={file.name}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                    onError={(e) => { e.target.src = 'https://via.placeholder.com/150?text=Error'; }}
                                                />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                    <a
                                                        href={file.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2 bg-white text-gray-800 rounded-full hover:bg-gray-100 shadow-lg"
                                                        title="View Original"
                                                    >
                                                        <Play className="w-4 h-4" />
                                                    </a>
                                                    <button
                                                        onClick={() => handleDeleteMedia(file.name)}
                                                        className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="p-3 border-t">
                                                <p className="text-xs font-medium text-gray-800 truncate" title={file.name}>
                                                    {file.name}
                                                </p>
                                                <p className="text-[10px] text-gray-400">
                                                    {(file.size / 1024).toFixed(1)} KB • {new Date(file.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                ) : !selectedTable ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <Database className="w-24 h-24 mb-4" />
                        <h2 className="text-2xl font-bold">Select a table to view</h2>
                        <p>Choose a table from the sidebar to view and manage its data</p>
                    </div>
                ) : (
                    <>
                        {/* Toolbar */}
                        <div className="bg-white border-b px-6 py-4 shadow-sm">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-800">{selectedTable}</h1>
                                    <p className="text-sm text-gray-500">
                                        {pagination.total || 0} rows total
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={openAddModal}
                                        className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-all shadow-md"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add Row
                                    </button>
                                    <button
                                        onClick={exportToCSV}
                                        className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-all shadow-md"
                                    >
                                        <Download className="w-4 h-4" />
                                        Export CSV
                                    </button>
                                    <button
                                        onClick={() => setShowSqlModal(true)}
                                        className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-all shadow-md"
                                    >
                                        <Code className="w-4 h-4" />
                                        SQL Query
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Data Grid */}
                        <div className="flex-1 overflow-auto p-6">
                            {dataLoading ? (
                                <div className="text-center text-gray-500 py-12">Loading data...</div>
                            ) : rows.length === 0 ? (
                                <div className="text-center text-gray-500 py-12">
                                    No data in this table yet. Click "Add Row" to insert data.
                                </div>
                            ) : (
                                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                                    <table className="w-full">
                                        <thead className="bg-gray-100 border-b-2 border-gray-200">
                                            <tr>
                                                {Object.keys(rows[0]).map(key => (
                                                    <th
                                                        key={key}
                                                        className={`px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors ${sortColumn === key ? 'text-blue-600' : ''
                                                            }`}
                                                        onClick={() => {
                                                            if (sortColumn === key) {
                                                                setSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC');
                                                            } else {
                                                                setSortColumn(key);
                                                                setSortOrder('DESC');
                                                            }
                                                        }}
                                                    >
                                                        <div className="flex items-center gap-1">
                                                            {key}
                                                            {sortColumn === key && (
                                                                sortOrder === 'ASC'
                                                                    ? <ChevronUp className="w-3 h-3" />
                                                                    : <ChevronDown className="w-3 h-3" />
                                                            )}
                                                        </div>
                                                    </th>
                                                ))}
                                                <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {rows.map((row, idx) => (
                                                <tr key={row.id || idx} className="hover:bg-gray-50 transition-colors">
                                                    {Object.entries(row).map(([key, value]) => (
                                                        <td key={key} className="px-4 py-3 text-sm text-gray-700">
                                                            {value === null ? (
                                                                <span className="text-gray-400 italic">NULL</span>
                                                            ) : (
                                                                String(value).length > 50
                                                                    ? String(value).substring(0, 50) + '...'
                                                                    : String(value)
                                                            )}
                                                        </td>
                                                    ))}
                                                    <td className="px-4 py-3 text-center">
                                                        <div className="flex justify-center gap-2">
                                                            <button
                                                                onClick={() => openEditModal(row)}
                                                                className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                                                                title="Edit"
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => openDeleteModal(row)}
                                                                className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                                                                title="Delete"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Pagination */}
                        {pagination.totalPages > 1 && (
                            <div className="bg-white border-t px-6 py-4 flex justify-between items-center">
                                <div className="text-sm text-gray-600">
                                    Showing page {pagination.page} of {pagination.totalPages}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="flex items-center gap-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                                        disabled={page === pagination.totalPages}
                                        className="flex items-center gap-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all"
                                    >
                                        Next
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Add Row Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden animate-slideIn">
                        <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white">Add New Row to {selectedTable}</h2>
                            <button onClick={() => setShowAddModal(false)} className="text-white hover:bg-white/20 p-1 rounded">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleAddRow} className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
                            <div className="grid grid-cols-2 gap-4">
                                {schema.filter(col => col.Field !== 'id' && !col.Extra.includes('auto_increment')).map(col => (
                                    <div key={col.Field}>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            {col.Field}
                                            {col.Null === 'NO' && <span className="text-red-500 ml-1">*</span>}
                                        </label>
                                        <input
                                            type={col.Type.includes('int') ? 'number' : 'text'}
                                            value={formData[col.Field] || ''}
                                            onChange={(e) => setFormData({ ...formData, [col.Field]: e.target.value })}
                                            required={col.Null === 'NO' && !col.Default}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                            placeholder={col.Type}
                                        />
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg"
                                >
                                    Add Row
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Row Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden animate-slideIn">
                        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white">Edit Row (ID: {editingRow?.id})</h2>
                            <button onClick={() => setShowEditModal(false)} className="text-white hover:bg-white/20 p-1 rounded">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateRow} className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
                            <div className="grid grid-cols-2 gap-4">
                                {Object.keys(formData).map(key => {
                                    // Determine if this is the ID column
                                    const idKey = Object.keys(editingRow || {}).find(k => k.toLowerCase() === 'id') ||
                                        (schema.find(col => col.Key === 'PRI')?.Field) ||
                                        Object.keys(editingRow || {})[0];
                                    const isIdCol = key === idKey;

                                    return (
                                        <div key={key}>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                {key} {isIdCol && <span className="text-xs text-gray-400 font-normal">(Primary Key)</span>}
                                            </label>
                                            <input
                                                type="text"
                                                value={formData[key] || ''}
                                                onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                                                disabled={isIdCol}
                                                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isIdCol ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''}`}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
                                >
                                    Update Row
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full animate-slideIn">
                        <div className="bg-gradient-to-r from-red-500 to-pink-600 px-6 py-4">
                            <h2 className="text-xl font-bold text-white">Confirm Deletion</h2>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-700 mb-4">
                                Are you sure you want to delete this row? This action cannot be undone.
                            </p>
                            <div className="bg-gray-100 p-3 rounded-lg mb-4">
                                <p className="text-sm font-mono text-gray-600">
                                    ID: {deletingRow?.id}
                                </p>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteRow}
                                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* SQL Query Modal */}
            {showSqlModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-slideIn">
                        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 px-6 py-4 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white">Execute SQL Query</h2>
                            <button onClick={() => setShowSqlModal(false)} className="text-white hover:bg-white/20 p-1 rounded">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                            <textarea
                                value={sqlQuery}
                                onChange={(e) => setSqlQuery(e.target.value)}
                                className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="SELECT * FROM users WHERE id = 1;"
                            />
                            <button
                                onClick={handleExecuteQuery}
                                className="mt-4 flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-lg"
                            >
                                <Play className="w-4 h-4" />
                                Execute
                            </button>

                            {sqlResults && (
                                <div className="mt-6">
                                    <h3 className="font-bold mb-2">Results:</h3>
                                    {sqlResults.data ? (
                                        <div className="bg-gray-50 rounded-lg overflow-auto max-h-96">
                                            <table className="w-full text-sm">
                                                <thead className="bg-gray-200">
                                                    <tr>
                                                        {Object.keys(sqlResults.data[0] || {}).map(key => (
                                                            <th key={key} className="px-3 py-2 text-left font-semibold">{key}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200">
                                                    {sqlResults.data.map((row, idx) => (
                                                        <tr key={idx}>
                                                            {Object.values(row).map((val, i) => (
                                                                <td key={i} className="px-3 py-2">{String(val)}</td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
                                            {sqlResults.message}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DatabaseViewer;
