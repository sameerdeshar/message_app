import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';

const MultiSelect = ({ options = [], value = [], onChange, placeholder = "Select items...", label }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = options.filter(option =>
        option.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const toggleOption = (optionValue) => {
        if (value.includes(optionValue)) {
            onChange(value.filter(v => v !== optionValue));
        } else {
            onChange([...value, optionValue]);
        }
    };

    const toggleAll = () => {
        if (value.length === options.length) {
            onChange([]);
        } else {
            onChange(options.map(opt => opt.value));
        }
    };

    const getSelectedLabels = () => {
        return options
            .filter(opt => value.includes(opt.value))
            .map(opt => opt.label);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                </label>
            )}

            <div
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white cursor-pointer hover:border-blue-400 transition-colors flex items-center justify-between"
            >
                <div className="flex-1 flex items-center gap-2 flex-wrap">
                    {value.length === 0 ? (
                        <span className="text-gray-400">{placeholder}</span>
                    ) : value.length === options.length ? (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                            All Pages Selected ({options.length})
                        </span>
                    ) : (
                        <>
                            {getSelectedLabels().slice(0, 2).map((label, idx) => (
                                <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                                    {label}
                                </span>
                            ))}
                            {value.length > 2 && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                                    +{value.length - 2} more
                                </span>
                            )}
                        </>
                    )}
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-hidden">
                    {/* Search */}
                    <div className="p-2 border-b border-gray-100">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>

                    {/* Select All */}
                    <div className="border-b border-gray-100">
                        <div
                            onClick={toggleAll}
                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 cursor-pointer transition-colors"
                        >
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${value.length === options.length
                                    ? 'bg-blue-500 border-blue-500'
                                    : 'border-gray-300'
                                }`}>
                                {value.length === options.length && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span className="text-sm font-medium text-gray-700">Select All</span>
                        </div>
                    </div>

                    {/* Options */}
                    <div className="max-h-60 overflow-y-auto">
                        {filteredOptions.length === 0 ? (
                            <div className="px-4 py-8 text-center text-sm text-gray-500">
                                No options found
                            </div>
                        ) : (
                            filteredOptions.map((option) => (
                                <div
                                    key={option.value}
                                    onClick={() => toggleOption(option.value)}
                                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 cursor-pointer transition-colors"
                                >
                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${value.includes(option.value)
                                            ? 'bg-blue-500 border-blue-500'
                                            : 'border-gray-300'
                                        }`}>
                                        {value.includes(option.value) && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                    <span className="text-sm text-gray-700">{option.label}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MultiSelect;
