'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ArrowLeft, Users, Zap, Coins, TrendingUp, Activity, ExternalLink } from 'lucide-react';

export default function ProjectDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const [project, setProject] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        async function fetchProject() {
            try {
                if (!params.id) return;
                const data = await api.projects.get(params.id as string);
                setProject(data);
            } catch (err) {
                setError('Failed to load project details.');
            } finally {
                setLoading(false);
            }
        }
        fetchProject();
    }, [params.id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    if (error || !project) {
        return (
            <div className="min-h-screen bg-black text-white p-8">
                <button onClick={() => router.back()} className="text-gray-400 hover:text-white flex items-center gap-2 mb-8">
                    <ArrowLeft size={20} /> Back to Explore
                </button>
                <div className="text-red-500 font-medium">Error: {error || 'Project not found'}</div>
            </div>
        );
    }

    // Format Helpers
    const formatCurrency = (val: string) => {
        const num = parseFloat(val);
        if (isNaN(num)) return '$0.00';
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
    };

    const formatNumber = (val: string | number) => {
        const num = typeof val === 'string' ? parseFloat(val) : val;
        if (isNaN(num)) return '0';
        return new Intl.NumberFormat('en-US', { notation: 'compact' }).format(num);
    };

    return (
        <div className="min-h-screen bg-black text-white font-sans">
            {/* Header */}
            <div className="border-b border-white/10 bg-white/5 backdrop-blur-md sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <ArrowLeft size={20} className="text-gray-300" />
                    </button>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                        {project.name}
                    </h1>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 capitalize">
                        {project.chain}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 capitalize">
                        {project.category}
                    </span>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
                {/* Intro Section */}
                <section className="bg-white/5 rounded-2xl p-8 border border-white/10">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <h2 className="text-3xl font-bold text-white mb-2">{project.name}</h2>
                            <p className="text-gray-400 max-w-2xl text-lg">{project.description || 'No description available for this project.'}</p>
                            <div className="flex items-center gap-4 mt-4">
                                <div className="flex items-center gap-2 text-sm text-gray-500 font-mono bg-black/30 px-3 py-1.5 rounded-md border border-white/5">
                                    <span className="text-gray-600">Contract:</span>
                                    <span className="text-gray-300">{project.contract_address}</span>
                                </div>
                                {project.website_url && (
                                    <a href={project.website_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 text-sm">
                                        Website <ExternalLink size={14} />
                                    </a>
                                )}
                            </div>
                        </div>
                        <div className={`px-4 py-2 rounded-lg border ${project.status === 'active' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-gray-800 border-gray-700 text-gray-400'}`}>
                            <span className="uppercase text-sm font-bold tracking-wider">{project.status}</span>
                        </div>
                    </div>
                </section>

                {/* Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <MetricCard
                        label="Total Users"
                        value={formatNumber(project.total_users || 0)}
                        subValue={project.new_users_7d ? `+${project.new_users_7d} (7d)` : null}
                        icon={Users}
                        color="blue"
                    />
                    <MetricCard
                        label="Gas Consumed"
                        value={formatNumber(project.gas_consumed || 0)}
                        subValue="Gwei"
                        icon={Zap}
                        color="orange"
                    />
                    <MetricCard
                        label="Fees Generated"
                        value={`${project.fees_generated ? Number(project.fees_generated).toFixed(4) : '0.00'} ETH`}
                        subValue={`~$${formatNumber((Number(project.fees_generated || 0) * 2000).toFixed(2))}`}
                        icon={Coins}
                        color="yellow"
                    />
                    <MetricCard
                        label="Retention Rate"
                        value={`${project.retention_rate || 0}%`}
                        subValue={`Churn: ${project.churn_rate || 0}%`}
                        icon={Activity}
                        color="purple"
                    />
                </div>

                {/* Deep Analysis Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Chart Placeholder */}
                    <div className="lg:col-span-2 bg-white/5 rounded-2xl p-6 border border-white/10 h-96 flex flex-col">
                        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                            <TrendingUp size={18} className="text-green-400" />
                            Transaction History (30 Days)
                        </h3>
                        <div className="flex-1 bg-gradient-to-b from-indigo-500/10 to-transparent rounded-lg flex items-center justify-center border border-dashed border-white/20">
                            <p className="text-gray-500">Interactive Chart Placeholder</p>
                            {/* In a real app, use Recharts here with historical data */}
                        </div>
                    </div>

                    {/* Sidebar Stats */}
                    <div className="space-y-6">
                        <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                            <h3 className="text-lg font-semibold text-white mb-4">Engagement Scores</h3>
                            <div className="space-y-4">
                                <ScoreRow label="Growth Score" value={project.growth_score || 0} max={100} />
                                <ScoreRow label="Adoption Rate" value={project.adoption_rate || 0} max={100} />
                                <ScoreRow label="Activation Rate" value={project.activation_rate || 0} max={100} />
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 border border-white/10 text-center">
                            <h3 className="text-white font-bold text-lg mb-2">Detailed Report</h3>
                            <p className="text-indigo-100 text-sm mb-4">Download comprehensive PDF report including on-chain forensics.</p>
                            <button className="bg-white text-indigo-600 px-4 py-2 rounded-lg text-sm font-bold shadow-lg hover:bg-gray-100 transition-colors w-full">
                                Download Report
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

function MetricCard({ label, value, subValue, icon: Icon, color }: any) {
    const colors = {
        blue: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
        orange: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
        yellow: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
        purple: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
    };
    const style = colors[color as keyof typeof colors] || colors.blue;

    return (
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all group">
            <div className="flex justify-between items-start mb-4">
                <h4 className="text-gray-400 text-sm font-medium">{label}</h4>
                <div className={`p-2 rounded-lg ${style}`}>
                    <Icon size={18} />
                </div>
            </div>
            <div className="space-y-1">
                <span className="text-2xl font-bold text-white group-hover:scale-105 inline-block transition-transform duration-300 origin-left">
                    {value}
                </span>
                {subValue && (
                    <p className="text-xs text-gray-500 font-medium font-mono">{subValue}</p>
                )}
            </div>
        </div>
    );
}

function ScoreRow({ label, value, max }: any) {
    const pct = (value / max) * 100;
    return (
        <div>
            <div className="flex justify-between text-sm mb-1.5">
                <span className="text-gray-400">{label}</span>
                <span className="text-white font-mono font-bold">{value}/{max}</span>
            </div>
            <div className="h-2 w-full bg-gray-700 rounded-full overflow-hidden">
                <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}
