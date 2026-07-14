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
        <div className="max-w-4xl mx-auto px-4 text-white">
            <h2 className="text-2xl font-bold mb-6 text-primary">Manage Categories</h2>
            
            <form onSubmit={handleAdd} className="mb-8 flex flex-col sm:flex-row gap-3">
                <input 
                    type="text" 
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="New Category Name"
                    className="flex-1 bg-gray-800 border border-gray-600 rounded px-4 py-2 focus:border-primary outline-none text-white"
                />
                <button type="submit" className="bg-primary text-black font-bold px-6 py-2 rounded hover:bg-green-400 whitespace-nowrap">
                    Add Category
                </button>
            </form>

            <div className="bg-card-dark rounded-lg p-2 border border-gray-800">
                {loading ? <div className="text-center py-4">Loading...</div> : (
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-700 text-gray-400">
                                <th className="p-3">Category Name</th>
                                <th className="p-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categories.map(cat => (
                                <tr key={cat.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                                    <td className="p-3">
                                        {editingId === cat.id ? (
                                            <input 
                                                autoFocus
                                                type="text" 
                                                value={editingName}
                                                onChange={(e) => setEditingName(e.target.value)}
                                                className="bg-gray-700 border border-gray-500 rounded px-2 py-1 w-full outline-none focus:border-primary"
                                            />
                                        ) : (
                                            cat.name
                                        )}
                                    </td>
                                    <td className="p-3 text-right">
                                        {editingId === cat.id ? (
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleUpdate(cat.id)} className="text-green-400 hover:text-green-300 bg-gray-800 px-2 py-1 rounded">Save</button>
                                                <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-300 bg-gray-800 px-2 py-1 rounded">Cancel</button>
                                            </div>
                                        ) : (
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => { setEditingId(cat.id); setEditingName(cat.name); }} className="text-blue-400 hover:text-blue-300 bg-gray-800 px-2 py-1 rounded">Edit</button>
                                                <button onClick={() => handleDelete(cat.id)} className="text-red-400 hover:text-red-300 bg-gray-800 px-2 py-1 rounded">Delete</button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {categories.length === 0 && (
                                <tr>
                                    <td colSpan="2" className="text-center py-4 text-gray-500">No categories found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default CategoryManager;
