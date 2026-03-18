import { useState, useMemo, useEffect, useCallback } from 'react';
import { searchProperties, loadSavedSearches, loadSavedSearch, saveSearchResults, deleteSavedSearch, fetchPropertyDetails, analyzePropertyForDeal, formatCurrency, formatPct, loadInvestorProperties, addInvestorProperty, removeInvestorProperty, loadInvestorPropertyIds, removePropertyFromSavedSearch } from '../../logic';
import { useConfig } from '../../contexts/ConfigContext.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { createInterestApi } from '../../logic/interestApi.js';
import { RequestAnalysisModal } from '../RequestAnalysisModal.jsx';
import styles from './PropertySearch.module.css';

const DEFAULT_IMAGE_PLACEHOLDER = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&q=80&w=800';

export function PropertyResultCard({ property, onAnalyze, onRequestAnalysis, matchingDealId, onViewDeal, isAnalyzing, isRequesting, analysis, includeInInvestorSearch, onIncludeChange, sourceSearchNames, checkboxDisabled, onDelete, deleteDisabled, blurAddress = false }) {
    const [imageError, setImageError] = useState(false);
    const imageSrc = imageError
        ? (property.imageFallback || DEFAULT_IMAGE_PLACEHOLDER)
        : property.image;

    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(price || 0);
    };

    return (
        <div className={styles.card}>
            <div className={styles.cardImageWrapper}>
                {imageSrc ? (
                    <img
                        src={imageSrc}
                        alt="Property"
                        className={styles.cardImage}
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <div className={styles.cardPlaceholder}>No Image Available</div>
                )}
                <div className={styles.cardBadges}>
                    {property.status && (
                        <div className={styles.cardStatus}>{property.status}</div>
                    )}
                    {analysis?.isDeal !== undefined && (
                        <div className={analysis.isDeal ? styles.dealBadge : styles.noDealBadge}>
                            {analysis.isDeal
                                ? `Deal (${analysis.dealRehabLevel ?? 'Full'})`
                                : 'No Deal'}
                        </div>
                    )}
                </div>
            </div>
            <div className={styles.cardContent}>
                <div className={styles.cardPrice}>{formatPrice(property.price)}</div>
                <div className={styles.cardDetails}>
                    {property.bedrooms > 0 && <span>{property.bedrooms} beds</span>}
                    {property.bathrooms > 0 && <span>• {property.bathrooms} baths</span>}
                    {property.squareFootage > 0 && <span>• {property.squareFootage.toLocaleString()} sqft</span>}
                </div>
                {property.listedDate && (
                    <div className={styles.cardListed}>
                        Listed {new Date(property.listedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                )}
                {analysis && (
                    <div className={styles.cardMetrics}>
                        <div className={styles.cardMetricFullWidth}>
                            <span className={styles.cardMetricLabel}>Rehab Level</span>
                            <span className={styles.cardMetricValue}>
                                {analysis.isDeal ? (analysis.dealRehabLevel ?? 'Full') : 'No Deal'}
                            </span>
                        </div>
                        <div className={styles.cardMetric}>
                            <span className={styles.cardMetricLabel}>Est. Rent</span>
                            <span className={styles.cardMetricValue}>{formatCurrency(analysis.estimatedRent)}/mo</span>
                        </div>
                        <div className={styles.cardMetric}>
                            <span className={styles.cardMetricLabel}>Annual NOI</span>
                            <span className={styles.cardMetricValue}>{formatCurrency(analysis.annualNOI)}</span>
                        </div>
                        <div className={styles.cardMetric}>
                            <span className={styles.cardMetricLabel}>B&H Cash-on-Cash ROI</span>
                            <span className={styles.cardMetricValue}>{formatPct(analysis.bhCashOnCash)}</span>
                        </div>
                        <div className={styles.cardMetric}>
                            <span className={styles.cardMetricLabel}>Investment Required</span>
                            <span className={styles.cardMetricValue}>{formatCurrency(analysis.investmentRequired)}</span>
                        </div>
                        {analysis.loanAmount != null && analysis.loanAmount > 0 && (
                            <div className={styles.cardMetric}>
                                <span className={styles.cardMetricLabel}>Loan Amount</span>
                                <span className={styles.cardMetricValue}>{formatCurrency(analysis.loanAmount)}</span>
                            </div>
                        )}
                    </div>
                )}
                <div className={`${styles.cardAddress} ${blurAddress ? styles.cardAddressBlurred : ''}`}>
                    {property.addressLine1}
                    <br />
                    {property.city}, {property.state} {property.zipCode}
                </div>
                {sourceSearchNames?.length > 0 && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.5rem' }}>
                        From: {sourceSearchNames.join(', ')}
                    </div>
                )}
                {onIncludeChange != null && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', cursor: checkboxDisabled ? 'not-allowed' : 'pointer', fontSize: '0.9rem', opacity: checkboxDisabled ? 0.7 : 1 }}>
                        <input
                            type="checkbox"
                            checked={!!includeInInvestorSearch}
                            onChange={(e) => onIncludeChange(property.id, e.target.checked)}
                            disabled={checkboxDisabled}
                            aria-label="Include in investor search"
                        />
                        <span>Include in investor search</span>
                    </label>
                )}
                {(onAnalyze || onRequestAnalysis || onViewDeal || onDelete) && (
                <div className={styles.cardAction} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {onViewDeal && (
                        <button
                            type="button"
                            className={styles.analyzeButton}
                            onClick={onViewDeal}
                        >
                            View Deal
                        </button>
                    )}
                    {onAnalyze && !onViewDeal && (
                        <button
                            type="button"
                            className={styles.analyzeButton}
                            onClick={() => onAnalyze(property)}
                            disabled={isAnalyzing}
                        >
                            {isAnalyzing ? 'Loading…' : 'Analyze Deal'}
                        </button>
                    )}
                    {onRequestAnalysis && !onAnalyze && !onViewDeal && (
                        <button
                            type="button"
                            className={styles.analyzeButton}
                            onClick={() => onRequestAnalysis(property)}
                            disabled={isRequesting}
                        >
                            {isRequesting ? 'Sending…' : 'Request Analysis'}
                        </button>
                    )}
                    {onDelete && (
                        <button
                            type="button"
                            className={styles.deleteButton}
                            onClick={() => onDelete(property)}
                            disabled={deleteDisabled}
                            aria-label="Delete property"
                        >
                            Delete
                        </button>
                    )}
                </div>
                )}
            </div>
        </div>
    );
}

/** Normalize address for matching property to deal. */
function normalizeAddressForMatch(street, city, state, zipCode) {
  let raw = (street || '').toString().trim().toLowerCase();
  raw = raw.replace(/\s+/g, ' ').replace(/\.\s*$/, '');
  const suffixes = [
    [' street', ' st'], [' avenue', ' ave'], [' boulevard', ' blvd'], [' drive', ' dr'],
    [' lane', ' ln'], [' road', ' rd'], [' court', ' ct'], [' circle', ' cir'],
    [' place', ' pl'], [' trail', ' trl'], [' highway', ' hwy'],
  ];
  for (const [long, short] of suffixes) {
    raw = raw.replace(new RegExp(long + '\\b', 'gi'), short);
  }
  const s = raw;
  const c = (city || '').toString().trim().toLowerCase();
  const st = (state || '').toString().trim().toUpperCase();
  const z = (zipCode || '').toString().replace(/\D/g, '').slice(0, 5);
  return `${s}|${c}|${st}|${z}`;
}

export default function PropertySearch({ userId, isAdmin = false, isClient = false, isDemo = false, demoDealAddress = null, savedDeals = [], initialSearchId = null, onImportProperty, onViewDeal, onCancel }) {
    const { config } = useConfig();
    const { user } = useAuth();
    const interestApi = useMemo(
        () => (user ? createInterestApi(() => user.getIdToken()) : null),
        [user]
    );
    const [criteria, setCriteria] = useState({
        city: 'Detroit',
        state: 'MI',
        zipCode: '',
        minPrice: '',
        maxPrice: '',
        minBeds: '',
        minBaths: '',
        minSquareFootage: '',
        propertyType: 'Any',
        status: 'all',
        listedAfter: '',
        listingsOlderThan: '0',
        daysOld: ''
    });
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [hasSearched, setHasSearched] = useState(false);
    const [sortBy, setSortBy] = useState('price-asc');
    const [filterMinPrice, setFilterMinPrice] = useState('');
    const [filterMaxPrice, setFilterMaxPrice] = useState('');
    const [filterMinSquareFootage, setFilterMinSquareFootage] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterDealStatus, setFilterDealStatus] = useState('all');
    const [addFinancing, setAddFinancing] = useState(false);
    const [financingDownPayment, setFinancingDownPayment] = useState('20');
    const [financingRate, setFinancingRate] = useState('7.5');
    const [savedSearches, setSavedSearches] = useState([]);
    const [savedSearchesLoading, setSavedSearchesLoading] = useState(false);
    const [saveInProgress, setSaveInProgress] = useState(false);
    const [saveName, setSaveName] = useState('');
    const [analyzingPropertyId, setAnalyzingPropertyId] = useState(null);
    const [fetchedDetailsByPropertyId, setFetchedDetailsByPropertyId] = useState({});
    const [requestModalProperty, setRequestModalProperty] = useState(null);
    const [requestSubmitting, setRequestSubmitting] = useState(false);
    const [investorProperties, setInvestorProperties] = useState([]);
    const [investorPropertiesLoading, setInvestorPropertiesLoading] = useState(false);
    const [includedPropertyIds, setIncludedPropertyIds] = useState(() => new Set());
    const [currentSearchId, setCurrentSearchId] = useState(null);
    const [deletingPropertyId, setDeletingPropertyId] = useState(null);

    useEffect(() => {
        const source = isAdmin ? results : investorProperties;
        if (source.length === 0) {
            setFetchedDetailsByPropertyId({});
            return;
        }
        const isDetroit = (p) =>
            (p.state || '').toString().trim().toUpperCase() === 'MI' &&
            (p.city || '').toString().toLowerCase().includes('detroit');
        const detroitProps = source.filter(isDetroit);
        if (detroitProps.length === 0) {
            setFetchedDetailsByPropertyId({});
            return;
        }
        let cancelled = false;
        Promise.all(
            detroitProps.map(async (p) => {
                const address = [p.addressLine1, p.city, p.state, p.zipCode]
                    .filter(Boolean).join(', ');
                const details = address ? await fetchPropertyDetails(address, { city: p.city, state: p.state }) : null;
                return { id: p.id, details };
            })
        ).then((pairs) => {
            if (cancelled) return;
            const next = {};
            pairs.forEach(({ id, details }) => {
                if (details) next[id] = details;
            });
            setFetchedDetailsByPropertyId(next);
        });
        return () => { cancelled = true; };
    }, [isAdmin, results, investorProperties]);

    const handleAnalyzeClick = async (property) => {
        setAnalyzingPropertyId(property.id);
        try {
            const address = [property.addressLine1, property.city, property.state, property.zipCode]
                .filter(Boolean).join(', ');
            const details = address
                ? await fetchPropertyDetails(address, { city: property.city, state: property.state })
                : null;
            const analysis = dealAnalysisByPropertyId[property.id];
            const rehabLevel = analysis?.dealRehabLevel ?? 'Full';
            const data = {
                ...property,
                ...(details || {}),
                notes: details?.legalDescription ?? property.notes ?? '',
                apn: (details?.apn || property.apn || '').trim() || 'Not Available',
                propertyOwner: (details?.propertyOwner || property.propertyOwner || '').trim() || 'Not Available',
                rehabLevel,
            };
            await onImportProperty(data);
        } catch (e) {
            console.error('Failed to import property', e);
        } finally {
            setAnalyzingPropertyId(null);
        }
    };

    const handleRequestAnalysisSubmit = async ({ propertySnapshot, message }) => {
        if (!interestApi) return;
        setRequestSubmitting(true);
        try {
            await interestApi.createInterest({
                type: 'request_analysis',
                propertySnapshot,
                message,
            });
            setRequestModalProperty(null);
        } finally {
            setRequestSubmitting(false);
        }
    };

    const refreshSavedSearches = async () => {
        if (!userId) return;
        setSavedSearchesLoading(true);
        try {
            const list = await loadSavedSearches(userId);
            setSavedSearches(list);
        } catch (e) {
            console.error('Failed to load saved searches', e);
        } finally {
            setSavedSearchesLoading(false);
        }
    };

    useEffect(() => {
        refreshSavedSearches();
    }, [userId]);

    useEffect(() => {
        if (!initialSearchId || !userId) return;
        let cancelled = false;
        loadSavedSearch(initialSearchId).then((saved) => {
            if (cancelled || !saved) return;
            setCriteria(saved.criteria);
            setResults(saved.results);
            setHasSearched(true);
            setCurrentSearchId(initialSearchId);
        }).catch((e) => console.error('Failed to load saved search', e));
        return () => { cancelled = true; };
    }, [initialSearchId, userId]);

    const refreshInvestorProperties = useCallback(async () => {
        setInvestorPropertiesLoading(true);
        try {
            const list = await loadInvestorProperties();
            setInvestorProperties(list);
        } catch (e) {
            console.error('Failed to load investor properties', e);
        } finally {
            setInvestorPropertiesLoading(false);
        }
    }, []);

    const refreshDemoProperties = useCallback(async () => {
        setInvestorPropertiesLoading(true);
        try {
            const res = await fetch('/api/demo?type=properties');
            const data = await res.json();
            const list = data.properties || [];
            setInvestorProperties(list);
        } catch (e) {
            console.error('Failed to load demo properties', e);
        } finally {
            setInvestorPropertiesLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isDemo) {
            refreshDemoProperties();
        } else if (!isAdmin && userId) {
            refreshInvestorProperties();
        }
    }, [isAdmin, isDemo, userId, refreshInvestorProperties, refreshDemoProperties]);

    useEffect(() => {
        if (isAdmin && results.length > 0) {
            loadInvestorPropertyIds().then((ids) => {
                const included = new Set(results.filter((p) => p?.id && ids.has(p.id)).map((p) => p.id));
                setIncludedPropertyIds(included);
            });
        } else if (isAdmin && results.length === 0) {
            setIncludedPropertyIds(new Set());
        }
    }, [isAdmin, results]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setCriteria(prev => ({ ...prev, [name]: value }));
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!isAdmin) return; // RentCast API restricted to admins
        setLoading(true);
        setError(null);
        setHasSearched(true);
        setCurrentSearchId(null);

        try {
            const data = await searchProperties(criteria);
            setResults(data);
        } catch (err) {
            setError(err.message || 'Failed to fetch properties. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveResults = async () => {
        if (!userId || !isAdmin || results.length === 0) return;
        const name = saveName.trim() || `Search ${new Date().toLocaleDateString()}`;
        setSaveInProgress(true);
        try {
            const searchId = await saveSearchResults(userId, name, criteria, results);
            for (const prop of results) {
                if (!prop?.id) continue;
                if (includedPropertyIds.has(prop.id)) {
                    await addInvestorProperty(prop, searchId, userId);
                } else {
                    await removeInvestorProperty(prop.id);
                }
            }
            setSaveName('');
            await refreshSavedSearches();
        } catch (e) {
            console.error('Failed to save search results', e);
        } finally {
            setSaveInProgress(false);
        }
    };

    const handleLoadSavedSearch = async (id) => {
        try {
            const saved = await loadSavedSearch(id);
            if (saved) {
                setCriteria(saved.criteria);
                setResults(saved.results);
                setHasSearched(true);
                setCurrentSearchId(id);
            }
        } catch (e) {
            console.error('Failed to load saved search', e);
        }
    };

    const handleDeleteProperty = async (property) => {
        if (!property?.id || !isAdmin) return;
        const addr = [property.addressLine1, property.city, property.state, property.zipCode].filter(Boolean).join(', ');
        if (!window.confirm(`Delete this property from the database?\n\n${addr || property.id}`)) return;
        setDeletingPropertyId(property.id);
        try {
            await removeInvestorProperty(property.id);
            if (currentSearchId) {
                await removePropertyFromSavedSearch(currentSearchId, property.id);
                setResults((prev) => prev.filter((p) => p?.id !== property.id));
                await refreshSavedSearches();
            } else {
                setResults((prev) => prev.filter((p) => p?.id !== property.id));
            }
        } catch (e) {
            console.error('Failed to delete property', e);
        } finally {
            setDeletingPropertyId(null);
        }
    };

    const handleDeleteSavedSearch = async (e, id) => {
        e.stopPropagation();
        if (!isAdmin) return;
        try {
            await deleteSavedSearch(id);
            await refreshSavedSearches();
        } catch (e) {
            console.error('Failed to delete saved search', e);
        }
    };

    const handleIncludeChange = (propertyId, included) => {
        setIncludedPropertyIds((prev) => {
            const next = new Set(prev);
            if (included) next.add(propertyId);
            else next.delete(propertyId);
            return next;
        });
    };

    const handleSelectAll = () => {
        setIncludedPropertyIds(new Set(filteredAndSortedResults.map((p) => p.id).filter(Boolean)));
    };

    const handleDeselectAll = () => {
        setIncludedPropertyIds(new Set());
    };

    const displayResults = isAdmin ? results : investorProperties;

    const addressToDealId = useMemo(() => {
        const map = new Map();
        if (savedDeals.length === 0) return map;
        // Prefer user's own deal over shared when multiple deals match same address
        savedDeals.forEach((d) => {
            const key = normalizeAddressForMatch(d.street, d.city, d.state, d.zipCode);
            if (key && key !== '|||') {
                if (d.isShared) {
                    if (!map.has(key)) map.set(key, d.id);
                } else {
                    map.set(key, d.id);
                }
            }
        });
        return map;
    }, [savedDeals]);

    const dealAnalysisByPropertyId = useMemo(() => {
        const financingOptions = addFinancing
            ? {
                addFinancing: true,
                downPaymentPct: Number(financingDownPayment) || 20,
                mortgage1RatePct: Number(financingRate) || 7.5,
              }
            : null;
        const map = {};
        displayResults.forEach((p) => {
            const details = fetchedDetailsByPropertyId[p.id];
            const merged = details ? { ...p, ...details } : p;
            const analysis = analyzePropertyForDeal(merged, financingOptions, config);
            if (analysis) map[p.id] = analysis;
        });
        return map;
    }, [displayResults, fetchedDetailsByPropertyId, addFinancing, financingDownPayment, financingRate, config]);

    const filteredAndSortedResults = useMemo(() => {
        let list = [...displayResults];

        if (filterStatus === 'active') list = list.filter(p => (p.status || '').toLowerCase() === 'active');
        else if (filterStatus === 'inactive') list = list.filter(p => (p.status || '').toLowerCase() !== 'active');

        if (filterDealStatus === 'deal') list = list.filter(p => dealAnalysisByPropertyId[p.id]?.isDeal === true);
        else if (filterDealStatus === 'nodeal') list = list.filter(p => dealAnalysisByPropertyId[p.id]?.isDeal === false);

        const minP = filterMinPrice ? Number(filterMinPrice) : null;
        const maxP = filterMaxPrice ? Number(filterMaxPrice) : null;
        if (minP != null && !isNaN(minP)) list = list.filter(p => p.price >= minP);
        if (maxP != null && !isNaN(maxP)) list = list.filter(p => p.price <= maxP);

        const minSqft = filterMinSquareFootage ? Number(filterMinSquareFootage) : null;
        if (minSqft != null && !isNaN(minSqft) && minSqft > 0) {
            list = list.filter(p => (p.squareFootage ?? 0) >= minSqft);
        }

        const [field, dir] = sortBy.split('-');
        list.sort((a, b) => {
            if (field === 'price') {
                return dir === 'asc' ? a.price - b.price : b.price - a.price;
            }
            if (field === 'date') {
                const da = a.listedDate ? new Date(a.listedDate).getTime() : 0;
                const db = b.listedDate ? new Date(b.listedDate).getTime() : 0;
                return dir === 'asc' ? da - db : db - da;
            }
            return 0;
        });
        return list;
    }, [displayResults, sortBy, filterMinPrice, filterMaxPrice, filterMinSquareFootage, filterStatus, filterDealStatus, dealAnalysisByPropertyId]);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 className={styles.title}>Find Properties</h1>
                        <p className={styles.subtitle}>
                            {isDemo
                                ? 'Browse demo properties. Create an account to view full addresses and analyze your own deals.'
                                : isAdmin
                                    ? 'Search for active listings that match your investment criteria.'
                                    : 'Browse properties marked for investor view by your admin.'}
                        </p>
                    </div>
                    <button type="button" onClick={onCancel} className={styles.backButton}>
                        Back to Analyzer
                    </button>
                </div>
            </header>

            {userId && isAdmin && (
                <div className={styles.savedSearchesSec}>
                    <h3 className={styles.savedSearchesTitle}>Saved searches</h3>
                    {savedSearchesLoading ? (
                        <p className={styles.savedSearchesEmpty}>Loading…</p>
                    ) : savedSearches.length === 0 ? (
                        <p className={styles.savedSearchesEmpty}>
                            No saved searches yet. Run a search and click Save results to save.
                        </p>
                    ) : (
                        <ul className={styles.savedSearchesList}>
                            {savedSearches.map((s) => (
                                <li key={s.id} className={styles.savedSearchItem}>
                                    <button
                                        type="button"
                                        className={styles.savedSearchLoad}
                                        onClick={() => handleLoadSavedSearch(s.id)}
                                    >
                                        {s.name} ({s.resultCount} properties)
                                    </button>
                                    {!s.isShared && (
                                        <button
                                            type="button"
                                            className={styles.savedSearchDelete}
                                            onClick={(e) => handleDeleteSavedSearch(e, s.id)}
                                            title="Delete saved search"
                                            aria-label={`Delete ${s.name}`}
                                        >
                                            Delete
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {isAdmin && (
            <form className={styles.searchForm} onSubmit={handleSearch}>
                <div className={styles.formGrid}>
                    <div className={styles.fieldGroup}>
                        <label className={styles.label} htmlFor="city">City</label>
                        <input
                            type="text" id="city" name="city" className={styles.input}
                            value={criteria.city} onChange={handleInputChange} placeholder="e.g., Austin"
                        />
                    </div>
                    <div className={styles.fieldGroup}>
                        <label className={styles.label} htmlFor="state">State (2-Letter)</label>
                        <input
                            type="text" id="state" name="state" className={styles.input} maxLength={2}
                            value={criteria.state} onChange={handleInputChange} placeholder="e.g., TX"
                        />
                    </div>
                    <div className={styles.fieldGroup}>
                        <label className={styles.label} htmlFor="zipCode">Zip Code</label>
                        <input
                            type="text" id="zipCode" name="zipCode" className={styles.input}
                            value={criteria.zipCode} onChange={handleInputChange} placeholder="e.g., 78701"
                        />
                    </div>
                    <div className={styles.fieldGroup}>
                        <label className={styles.label} htmlFor="minPrice">Min Price ($)</label>
                        <input
                            type="number" id="minPrice" name="minPrice" className={styles.input}
                            value={criteria.minPrice} onChange={handleInputChange} placeholder="e.g., 50000"
                        />
                    </div>
                    <div className={styles.fieldGroup}>
                        <label className={styles.label} htmlFor="maxPrice">Max Price ($)</label>
                        <input
                            type="number" id="maxPrice" name="maxPrice" className={styles.input}
                            value={criteria.maxPrice} onChange={handleInputChange} placeholder="e.g., 500000"
                        />
                    </div>
                    <div className={styles.fieldGroup}>
                        <label className={styles.label} htmlFor="minBeds">Min Beds</label>
                        <input
                            type="number" id="minBeds" name="minBeds" className={styles.input} min={0}
                            value={criteria.minBeds} onChange={handleInputChange} placeholder="Any"
                        />
                    </div>
                    <div className={styles.fieldGroup}>
                        <label className={styles.label} htmlFor="minBaths">Min Baths</label>
                        <input
                            type="number" id="minBaths" name="minBaths" className={styles.input} min={0} step="0.5"
                            value={criteria.minBaths} onChange={handleInputChange} placeholder="Any"
                        />
                    </div>
                    <div className={styles.fieldGroup}>
                        <label className={styles.label} htmlFor="minSquareFootage">Min Sq Ft</label>
                        <input
                            type="number" id="minSquareFootage" name="minSquareFootage" className={styles.input} min={0}
                            value={criteria.minSquareFootage} onChange={handleInputChange} placeholder="Any"
                        />
                    </div>
                    <div className={styles.fieldGroup}>
                        <label className={styles.label} htmlFor="propertyType">Property Type</label>
                        <select
                            id="propertyType" name="propertyType" className={styles.select}
                            value={criteria.propertyType} onChange={handleInputChange}
                        >
                            <option value="Any">Any Type</option>
                            <option value="Single Family">Single Family</option>
                            <option value="Multi-Family">Multi-Family</option>
                            <option value="Condo">Condo / Townhouse</option>
                        </select>
                    </div>
                    <div className={styles.fieldGroup}>
                        <label className={styles.label} htmlFor="status">Status</label>
                        <select
                            id="status" name="status" className={styles.select}
                            value={criteria.status ?? 'all'} onChange={handleInputChange}
                        >
                            <option value="all">All</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                    <div className={styles.fieldGroup}>
                        <label className={styles.label} htmlFor="listedAfter">Listed after</label>
                        <input
                            type="date" id="listedAfter" name="listedAfter" className={styles.input}
                            value={criteria.listedAfter ?? ''} onChange={handleInputChange}
                        />
                    </div>
                    <div className={styles.fieldGroup}>
                        <label className={styles.label} htmlFor="listingsOlderThan">Listings older than</label>
                        <select
                            id="listingsOlderThan" name="listingsOlderThan" className={styles.select}
                            value={criteria.listingsOlderThan ?? '0'} onChange={handleInputChange}
                        >
                            <option value="0">0 days</option>
                            <option value="30">30 days</option>
                            <option value="60">60 days</option>
                            <option value="90">90 days</option>
                        </select>
                    </div>
                    <div className={styles.fieldGroup}>
                        <label className={styles.label} htmlFor="daysOld">Listed within last (days)</label>
                        <select
                            id="daysOld" name="daysOld" className={styles.select}
                            value={criteria.daysOld ?? ''} onChange={handleInputChange}
                        >
                            <option value="">Any</option>
                            <option value="1:7">1–7 days (new this week)</option>
                            <option value="1:14">1–14 days</option>
                            <option value="1:30">1–30 days</option>
                        </select>
                    </div>
                </div>
                <button type="submit" className={styles.searchButton} disabled={loading}>
                    {loading ? (
                        <><span className={styles.loadingSpinner}></span> Searching...</>
                    ) : 'Search Deals'}
                </button>
            </form>
            )}

            {error && <div className={styles.errorMsg}>{error}</div>}

            <div className={styles.resultsArea}>
                {(hasSearched || !isAdmin) && !loading && !investorPropertiesLoading && (
                    <>
                        <div className={styles.resultsHeader}>
                            <h2 className={styles.title} style={{ fontSize: '1.25rem' }}>
                                {isAdmin ? 'Search Results' : 'Available Properties'}
                            </h2>
                            <span className={styles.resultsCount}>
                                {filteredAndSortedResults.length} of {displayResults.length} properties
                            </span>
                        </div>
                        {userId && isAdmin && results.length > 0 && (
                            <div className={styles.saveResultsRow}>
                                <input
                                    type="text"
                                    className={styles.saveNameInput}
                                    placeholder="Name for this search (optional)"
                                    value={saveName}
                                    onChange={(e) => setSaveName(e.target.value)}
                                />
                                <button
                                    type="button"
                                    className={styles.saveResultsButton}
                                    onClick={handleSaveResults}
                                    disabled={saveInProgress}
                                >
                                    {saveInProgress ? 'Saving…' : 'Save results'}
                                </button>
                            </div>
                        )}
                        <div className={styles.resultsToolbar}>
                            {isAdmin && displayResults.length > 0 && (
                                <div className={styles.sortFilterRow}>
                                    <button type="button" className={styles.saveResultsButton} onClick={handleSelectAll} style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}>
                                        Select all
                                    </button>
                                    <button type="button" className={styles.saveResultsButton} onClick={handleDeselectAll} style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}>
                                        Deselect all
                                    </button>
                                </div>
                            )}
                            <div className={styles.sortFilterRow}>
                                <label className={styles.toolbarLabel}>Sort by</label>
                                <select
                                    className={styles.sortSelect}
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                >
                                    <option value="price-asc">Price: Low to High</option>
                                    <option value="price-desc">Price: High to Low</option>
                                    <option value="date-desc">Listed: Newest First</option>
                                    <option value="date-asc">Listed: Oldest First</option>
                                </select>
                            </div>
                            <div className={styles.sortFilterRow}>
                                <label className={styles.toolbarLabel}>Filter by price</label>
                                <input
                                    type="number"
                                    className={styles.filterInput}
                                    placeholder="Min $"
                                    value={filterMinPrice}
                                    onChange={(e) => setFilterMinPrice(e.target.value)}
                                />
                                <span className={styles.filterSeparator}>–</span>
                                <input
                                    type="number"
                                    className={styles.filterInput}
                                    placeholder="Max $"
                                    value={filterMaxPrice}
                                    onChange={(e) => setFilterMaxPrice(e.target.value)}
                                />
                            </div>
                            <div className={styles.sortFilterRow}>
                                <label className={styles.toolbarLabel}>Min sq ft</label>
                                <input
                                    type="number"
                                    className={styles.filterInput}
                                    placeholder="Any"
                                    min={0}
                                    value={filterMinSquareFootage}
                                    onChange={(e) => setFilterMinSquareFootage(e.target.value)}
                                />
                            </div>
                            <div className={styles.sortFilterRow}>
                                <label className={styles.toolbarLabel}>Status</label>
                                <select
                                    className={styles.sortSelect}
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                >
                                    <option value="all">All</option>
                                    <option value="active">Active only</option>
                                    <option value="inactive">Inactive only</option>
                                </select>
                            </div>
                            <div className={styles.sortFilterRow}>
                                <label className={styles.toolbarLabel}>Deal Status</label>
                                <select
                                    className={styles.sortSelect}
                                    value={filterDealStatus}
                                    onChange={(e) => setFilterDealStatus(e.target.value)}
                                >
                                    <option value="all">All</option>
                                    <option value="deal">Deal only</option>
                                    <option value="nodeal">No Deal only</option>
                                </select>
                            </div>
                            <div className={styles.sortFilterRow} style={{ alignItems: 'center', gap: '0.75rem' }}>
                                <label className={styles.toolbarLabel} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                                    <input
                                        type="checkbox"
                                        checked={addFinancing}
                                        onChange={(e) => setAddFinancing(e.target.checked)}
                                        id="addFinancing"
                                    />
                                    Add financing
                                </label>
                                {addFinancing && (
                                    <>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <label htmlFor="financingDownPayment" className={styles.toolbarLabel} style={{ margin: 0, whiteSpace: 'nowrap' }}>Down payment (%)</label>
                                            <input
                                                type="number"
                                                id="financingDownPayment"
                                                className={styles.filterInput}
                                                style={{ width: '70px' }}
                                                min={0}
                                                max={100}
                                                step={1}
                                                value={financingDownPayment}
                                                onChange={(e) => setFinancingDownPayment(e.target.value)}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <label htmlFor="financingRate" className={styles.toolbarLabel} style={{ margin: 0, whiteSpace: 'nowrap' }}>Interest rate (%)</label>
                                            <input
                                                type="number"
                                                id="financingRate"
                                                className={styles.filterInput}
                                                style={{ width: '70px' }}
                                                min={0}
                                                max={30}
                                                step={0.1}
                                                value={financingRate}
                                                onChange={(e) => setFinancingRate(e.target.value)}
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {loading || (!isAdmin && investorPropertiesLoading) ? (
                    <div className={styles.emptyState}>
                        <div className={styles.loadingSpinnerLarge}></div>
                        <p>{isAdmin ? 'Searching for investment properties...' : 'Loading properties...'}</p>
                    </div>
                ) : !isAdmin && investorProperties.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyStateIcon}>🔍</div>
                        <p>{isDemo ? 'No demo properties available yet.' : 'No properties available yet. Contact an admin.'}</p>
                    </div>
                ) : hasSearched && results.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyStateIcon}>🔍</div>
                        <p>No properties found matching those criteria.</p>
                        <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Try broadening your search.</p>
                    </div>
                ) : filteredAndSortedResults.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyStateIcon}>🔍</div>
                        <p>No properties match the current filters.</p>
                        <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Try adjusting price range or status.</p>
                    </div>
                ) : (
                    <div className={styles.resultsGrid}>
                        {filteredAndSortedResults.map(property => {
                            const propStreet = property.addressLine1 ?? property.street;
                            const propKey = normalizeAddressForMatch(propStreet, property.city, property.state, property.zipCode);
                            const demoKey = demoDealAddress
                                ? normalizeAddressForMatch(demoDealAddress.street, demoDealAddress.city, demoDealAddress.state, demoDealAddress.zipCode)
                                : null;
                            const isDemoMackay = isDemo && demoKey && propKey === demoKey;
                            const matchingDealId = onViewDeal && !isDemo
                                ? addressToDealId.get(propKey)
                                : isDemoMackay && savedDeals?.[0]?.id
                                    ? savedDeals[0].id
                                    : null;
                            const blurAddress = isDemo && !isDemoMackay;
                            const showViewDeal = isDemo ? isDemoMackay && onViewDeal : matchingDealId && onViewDeal;
                            const showAnalyze = !isDemo && onImportProperty ? handleAnalyzeClick : undefined;
                            const showRequestAnalysis = !isDemo && !onImportProperty && !matchingDealId && interestApi ? (p) => setRequestModalProperty(p) : undefined;
                            return (
                            <PropertyResultCard
                                key={property.id}
                                property={property}
                                onAnalyze={showAnalyze}
                                onRequestAnalysis={showRequestAnalysis}
                                matchingDealId={matchingDealId}
                                onViewDeal={showViewDeal ? () => onViewDeal(matchingDealId) : undefined}
                                isAnalyzing={analyzingPropertyId === property.id}
                                isRequesting={false}
                                analysis={dealAnalysisByPropertyId[property.id]}
                                includeInInvestorSearch={isAdmin && !isDemo ? includedPropertyIds.has(property.id) : undefined}
                                onIncludeChange={isAdmin && !isDemo ? handleIncludeChange : undefined}
                                onDelete={isAdmin && !isDemo ? handleDeleteProperty : undefined}
                                deleteDisabled={deletingPropertyId === property.id}
                                blurAddress={blurAddress}
                            />
                            );
                        })}
                    </div>
                )}
            </div>

            {requestModalProperty && (
                <RequestAnalysisModal
                    property={requestModalProperty}
                    onClose={() => setRequestModalProperty(null)}
                    onSubmit={handleRequestAnalysisSubmit}
                    isSubmitting={requestSubmitting}
                />
            )}
        </div>
    );
}
