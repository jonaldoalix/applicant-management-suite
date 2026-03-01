import React from 'react';
import he from 'he';

/**
 * Highlights search terms within a string.
 */
export const highlightMatch = (text, searchTerm) => {
    if (!text || !searchTerm) return text;
    const strText = String(text);
    const escapedSearchTerm = searchTerm.replaceAll(/[-^$*+?.()|[\]{}/]/g, String.raw`\$&`);
    const regex = new RegExp('(' + escapedSearchTerm + ')', 'gi');
    const parts = strText.split(regex);
    return <span>{parts.map((part) => (regex.test(part) ? <strong key={part}>{part}</strong> : part))}</span>;
};

export const sanitizeEmailString = (str) => {
    if (!str) return '';
    return he.decode(str).replaceAll(/[<>"]/g, ' ').trim();
};

export const findRelevantFamilyMember = (familyMembers, term) => {
    const defaultMember = familyMembers?.[0] || null;
    if (!term || !Array.isArray(familyMembers)) return defaultMember;

    const termLower = term.toLowerCase();
    const matchedMember = familyMembers.find((member) => 
        member?.fullName?.toLowerCase().includes(termLower) || 
        member?.occupation?.toLowerCase().includes(termLower)
    );
    return matchedMember || defaultMember;
};

export const findRelevantExperience = (positions, term) => {
    const defaultExp = positions?.[0] || null;
    if (!term || !Array.isArray(positions)) return defaultExp;

    const termLower = term.toLowerCase();
    const matched = positions.find((pos) => 
        pos?.organization?.toLowerCase().includes(termLower) || 
        pos?.location?.toLowerCase().includes(termLower) || 
        pos?.role?.toLowerCase().includes(termLower)
    );
    return matched || defaultExp;
};