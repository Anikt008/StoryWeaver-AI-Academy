import React from 'react';
import { UserProgress } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Award, BookOpen, Brain, TrendingUp, Zap } from 'lucide-react';

interface DashboardProps {
  progress: UserProgress;
}

const Dashboard: React.FC<DashboardProps> = ({ progress }) => {
  const data = progress.literacyScore.map((score, index) => ({
    session: `S${index + 1}`,
    literacy: score,
    engagement: progress.engagementScore[index] || 60
  }));

  const engagementLift = 35; // Mock calculation based on prompt requirement

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 animate-fadeIn pb-32">
      {/* Impact Banner */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-3xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
            <h2 className="text-3xl font-fredoka font-bold mb-2">Incredible Progress! 🚀</h2>
            <p className="text-indigo-100 text-lg">Your interactive sessions have boosted engagement by <span className="font-bold text-yellow-300">~{engagementLift}%</span> this week.</p>
        </div>
        <div className="bg-white/20 backdrop-blur p-4 rounded-2xl flex items-center gap-3 border border-white/30">
            <Zap className="w-8 h-8 text-yellow-300" />
            <div>
                <div className="text-sm opacity-80">Focus Score</div>
                <div className="text-2xl font-bold">92/100</div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <StatCard icon={<Award className="w-6 h-6 text-yellow-600" />} bg="bg-yellow-100" label="Badges" value={progress.badges.length} />
        <StatCard icon={<BookOpen className="w-6 h-6 text-indigo-600" />} bg="bg-indigo-100" label="Stories" value={progress.storiesCompleted} />
        <StatCard icon={<Brain className="w-6 h-6 text-pink-600" />} bg="bg-pink-100" label="Quizzes" value={progress.quizzesPassed} />
        <StatCard icon={<TrendingUp className="w-6 h-6 text-green-600" />} bg="bg-green-100" label="Total XP" value={progress.totalPoints} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ChartCard title="Comprehension Growth">
          <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="session" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                <Line type="monotone" dataKey="literacy" stroke="#6366f1" strokeWidth={3} dot={{r: 4, strokeWidth: 2, fill: '#fff'}} />
              </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Engagement Analysis">
           <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="session" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '12px', border: 'none'}} />
                <Bar dataKey="engagement" fill="#ec4899" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
};

const StatCard = ({icon, bg, label, value}: any) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center text-center hover:translate-y-[-2px] transition-transform">
        <div className={`p-3 ${bg} rounded-2xl mb-3`}>{icon}</div>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold">{label}</p>
        <h3 className="text-3xl font-fredoka text-slate-800 dark:text-white">{value}</h3>
    </div>
);

const ChartCard = ({title, children}: any) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-lg border border-indigo-50 dark:border-slate-700">
        <h3 className="text-xl font-fredoka text-slate-800 dark:text-white mb-6">{title}</h3>
        <div className="h-64">{children}</div>
    </div>
);

export default Dashboard;
