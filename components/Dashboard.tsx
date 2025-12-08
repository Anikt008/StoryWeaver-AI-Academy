import React from 'react';
import { UserProgress } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Award, BookOpen, Brain, TrendingUp } from 'lucide-react';

interface DashboardProps {
  progress: UserProgress;
}

const Dashboard: React.FC<DashboardProps> = ({ progress }) => {
  const data = progress.literacyScore.map((score, index) => ({
    session: `S${index + 1}`,
    literacy: score,
    engagement: progress.engagementScore[index] || 50
  }));

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 animate-fadeIn">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-yellow-100 rounded-2xl text-yellow-600">
            <Award className="w-8 h-8" />
          </div>
          <div>
            <p className="text-slate-500 text-sm font-semibold">Badges Earned</p>
            <h3 className="text-3xl font-fredoka text-slate-800">{progress.badges.length}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-indigo-100 rounded-2xl text-indigo-600">
            <BookOpen className="w-8 h-8" />
          </div>
          <div>
            <p className="text-slate-500 text-sm font-semibold">Stories Completed</p>
            <h3 className="text-3xl font-fredoka text-slate-800">{progress.storiesCompleted}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-pink-100 rounded-2xl text-pink-600">
            <Brain className="w-8 h-8" />
          </div>
          <div>
            <p className="text-slate-500 text-sm font-semibold">Quizzes Aced</p>
            <h3 className="text-3xl font-fredoka text-slate-800">{progress.quizzesPassed}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-green-100 rounded-2xl text-green-600">
            <TrendingUp className="w-8 h-8" />
          </div>
          <div>
            <p className="text-slate-500 text-sm font-semibold">Total XP</p>
            <h3 className="text-3xl font-fredoka text-slate-800">{progress.totalPoints}</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-3xl shadow-lg border border-indigo-50">
          <h3 className="text-xl font-fredoka text-slate-800 mb-6 flex items-center">
            Literacy Gains
            <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">Last 10 Sessions</span>
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="session" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                <Tooltip 
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Line type="monotone" dataKey="literacy" stroke="#6366f1" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-lg border border-indigo-50">
          <h3 className="text-xl font-fredoka text-slate-800 mb-6">Engagement Analysis</h3>
          <div className="h-64">
             <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="session" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none'}} />
                <Bar dataKey="engagement" fill="#ec4899" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Badges Display */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl p-8 text-white relative overflow-hidden">
        <div className="relative z-10">
            <h3 className="text-2xl font-fredoka mb-4">Your Trophy Case</h3>
            <div className="flex flex-wrap gap-4">
                {progress.badges.length > 0 ? progress.badges.map((b, i) => (
                    <span key={i} className="bg-white/20 backdrop-blur px-4 py-2 rounded-xl border border-white/30 flex items-center gap-2">
                        <Award className="w-4 h-4 text-yellow-300" /> {b}
                    </span>
                )) : (
                    <span className="text-indigo-200 italic">Complete stories to earn badges!</span>
                )}
            </div>
        </div>
        <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-10 translate-y-10">
            <Award className="w-64 h-64" />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;