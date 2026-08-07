import React, { useState, useEffect } from 'react';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../api';

const CategoryManager = () => {
    const [categories, setCategories] = useState([]);
    const [newCategory, setNewCategory] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editingName, setEditingName] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const res = await getCategories();
            setCategories(res.data);
        } catch (err) {
            console.error("Failed to fetch categories", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newCategory.trim()) return;
        try {
            await createCategory({ name: newCategory });
            setNewCategory('');
            fetchCategories();
        } catch {
            alert('Failed to add category');
        }
    };

    const handleUpdate = async (id) => {
        if (!editingName.trim()) return;
        try {
            await updateCategory(id, { name: editingName });
            setEditingId(null);
            setEditingName('');
            fetchCategories();
        } catch {
            alert('Failed to update category');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure? This might affect existing transactions.')) return;
        try {
            await deleteCategory(id);
            fetchCategories();
        } catch {
            alert('Failed to delete category');
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-4 text-text-main animate-fade-in space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">Category Registrar</h2>
                <p className="text-xs sm:text-sm text-text-muted mt-0.5">Define custom taxons and spending/income labels.</p>
            </div>
            
            <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3">
                <input 
                    type="text" 
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="New Category Name (e.g. Subscriptions)"
                    className="flex-1 bg-bg-dark border border-border-main rounded-xl px-4 py-2.5 outline-none focus:border-primary text-sm text-text-main placeholder-text-muted font-semibold"
                />
                <button 
                    type="submit" 
                    className="bg-primary hover:bg-primary-hover text-black font-extrabold px-6 py-2.5 rounded-xl whitespace-nowrap text-sm cursor-pointer shadow active:scale-95 transition-transform"
                >
                    Add Category
                </button>
            </form>

            <div className="bg-card-dark rounded-2xl border border-border-main overflow-hidden shadow-xl">
                {loading ? (
                    <div className="text-center py-10 text-text-muted flex flex-col justify-center items-center gap-3">
                        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                        <p className="text-sm font-semibold">Updating category catalog...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border-main bg-bg-dark/40 text-text-muted text-[10px] font-bold uppercase tracking-wider">
                                    <th className="py-4 px-5">Category Name</th>
                                    <th className="py-4 px-5 text-right font-bold">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-main/50">
                                {categories.map(cat => (
                                    <tr key={cat.id} className="hover:bg-bg-dark/20 transition-colors">
                                        <td className="py-4 px-5 text-sm font-semibold">
                                            {editingId === cat.id ? (
                                                <input 
                                                    autoFocus
                                                    type="text" 
                                                    value={editingName}
                                                    onChange={(e) => setEditingName(e.target.value)}
                                                    className="bg-bg-dark border border-border-main rounded-xl px-3 py-1.5 w-full outline-none focus:border-primary text-text-main text-xs font-semibold"
                                                />
                                            ) : (
                                                <span className="text-text-main">{cat.name}</span>
                                            )}
                                        </td>
                                        <td className="py-4 px-5 text-right text-xs">
                                            {editingId === cat.id ? (
                                                <div className="flex justify-end gap-2">
                                                    <button 
                                                        onClick={() => handleUpdate(cat.id)} 
                                                        className="bg-success text-black px-3 py-1.5 rounded-lg font-extrabold shadow cursor-pointer active:scale-95"
                                                    >
                                                        Save
                                                    </button>
                                                    <button 
                                                        onClick={() => setEditingId(null)} 
                                                        className="bg-bg-dark border border-border-main text-text-muted px-3 py-1.5 rounded-lg font-extrabold cursor-pointer"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex justify-end gap-3.5">
                                                    <button 
                                                        onClick={() => { setEditingId(cat.id); setEditingName(cat.name); }} 
                                                        className="text-primary hover:underline font-bold text-xs cursor-pointer"
                                                    >
                                                        ✏️ Edit
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(cat.id)} 
                                                        className="text-error hover:underline font-bold text-xs cursor-pointer"
                                                    >
                                                        🗑️ Delete
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {categories.length === 0 && (
                                    <tr>
                                        <td colSpan="2" className="text-center py-10 text-text-muted font-semibold text-sm">No categories defined yet.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CategoryManager;
