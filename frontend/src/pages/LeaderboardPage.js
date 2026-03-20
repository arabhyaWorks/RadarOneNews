import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { cachedGet } from '../lib/apiCache';
import { useLanguage } from '../contexts/LanguageContext';
import { Trophy, Flame, Target, Star, ChevronLeft } from 'lucide-react';
import branding from '../config/branding';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function LeaderboardPage() {
  const { t, isHindi } = useLanguage();
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const response = await cachedGet(axios, `${API}/public/leaderboard`, {}, 60_000);
      setLeaders(response.data);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPodiumColor = (rank) => {
    if (rank === 1) return 'from-yellow-400 to-yellow-600 border-yellow-300';
    if (rank === 2) return 'from-gray-300 to-gray-500 border-gray-200';
    if (rank === 3) return 'from-amber-600 to-amber-800 border-amber-500';
    return '';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 bg-[#b91c1c] rounded-full flex items-center justify-center mb-4">
            <Trophy className="w-8 h-8 text-[#f4c430]" />
          </div>
          <p className="text-gray-600">{isHindi ? 'लीडरबोर्ड लोड हो रहा है...' : 'Loading Leaderboard...'}</p>
        </div>
      </div>
    );
  }

  const top3 = leaders.slice(0, 3);
  const remaining = leaders.slice(3);

  // Reorder Top 3 for podium display (2nd, 1st, 3rd)
  const podiumOrder = top3.length === 3 ? [top3[1], top3[0], top3[2]] : top3;

  return (
    <>
      <Helmet>
        <title>{isHindi ? `लीडरबोर्ड | ${branding.nameHi}` : `Leaderboard | ${branding.name}`}</title>
        <meta name="description" content={isHindi ? 'हमारे शीर्ष पत्रकारों और उनके स्कोर को देखें।' : 'View our top journalists and their scores.'} />
      </Helmet>

      <div className="min-h-screen bg-[#faf9f6] pb-16">
        {/* Header Hero */}
        <div className="bg-[#b91c1c] text-white py-12 px-4 relative overflow-hidden shadow-md">
          <div className="max-w-[1200px] mx-auto text-center relative z-10">
            <h1 className={`text-4xl md:text-5xl font-bold text-[#f4c430] mb-4 flex items-center justify-center gap-3 ${isHindi ? 'font-hindi-heading' : 'font-heading'}`}>
              <Trophy className="w-8 h-8 md:w-10 md:h-10" />
              {isHindi ? 'पत्रकार लीडरबोर्ड' : 'Journalist Leaderboard'}
            </h1>
            <p className={`text-lg text-white/80 max-w-2xl mx-auto ${isHindi ? 'font-hindi' : ''}`}>
              {isHindi 
                ? 'हमारे शीर्ष पत्रकारों की रैंकिंग, उनके स्कोर और दैनिक प्रकाशन लकीर (streak) के आधार पर।' 
                : 'Ranking of our top journalists based on their total score and continuous publishing streak.'}
            </p>
          </div>
          {/* Decorative background elements */}
          <div className="absolute top-0 left-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#f4c430] opacity-5 rounded-full blur-3xl translate-x-1/3 translate-y-1/3"></div>
        </div>

        <div className="max-w-[1200px] mx-auto px-4 -mt-8 relative z-20">
          
          {/* Top 3 Podium */}
          {top3.length > 0 && (
            <div className="flex flex-col md:flex-row items-end justify-center gap-4 md:gap-6 mb-12">
              {podiumOrder.map((user, idx) => {
                const isWinner = user.rank === 1;
                const heightClass = user.rank === 1 ? 'h-64 md:h-72' : user.rank === 2 ? 'h-48 md:h-56' : 'h-40 md:h-48';
                const baseStyles = 'bg-white rounded-t-xl shadow-lg border flex flex-col items-center justify-start p-6 relative w-full md:w-64 transition-transform hover:-translate-y-2';
                
                return (
                  <Link to={`/author/${user.user_id}`} key={user.user_id} className={`${baseStyles} ${heightClass} ${isWinner ? 'md:order-2 z-10' : idx === 0 ? 'md:order-1' : 'md:order-3'}`}>
                    {/* Rank Badge */}
                    <div className={`absolute -top-6 w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-lg bg-gradient-to-br border-2 ${getPodiumColor(user.rank)}`}>
                      {user.rank}
                    </div>
                    
                    {/* Profile Picture */}
                    <div className="w-20 h-20 rounded-full bg-gray-100 border-4 border-white shadow-md overflow-hidden mt-2 mb-3">
                      {user.picture ? (
                        <img src={user.picture} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[#b91c1c] text-white text-3xl font-bold">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    
                    {/* Name */}
                    <h2 className="font-bold text-gray-900 text-center text-lg mb-1 truncate w-full">{user.name}</h2>
                    
                    {/* Score */}
                    <div className="flex items-center gap-1 text-[#f4c430] font-bold text-xl mt-auto">
                      <Star className="w-5 h-5 fill-current" />
                      {user.score}
                    </div>
                    
                    {/* Streak */}
                    <div className="flex items-center gap-1 text-orange-500 text-sm font-semibold mt-1">
                      <Flame className="w-4 h-4 fill-current" />
                      {user.current_streak} {isHindi ? 'दिन' : 'Days'}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Remaining List */}
          {remaining.length > 0 && (
            <div className="bg-white rounded border shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b">
                    <tr className="text-gray-600 text-sm uppercase tracking-wider">
                      <th className="px-6 py-4 font-semibold w-24 text-center">Rank</th>
                      <th className="px-6 py-4 font-semibold">Journalist</th>
                      <th className="px-6 py-4 font-semibold text-right">Score</th>
                      <th className="px-6 py-4 font-semibold text-right">Streak</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {remaining.map((user) => (
                      <tr key={user.user_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-bold mx-auto border border-gray-200">
                            {user.rank}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Link to={`/author/${user.user_id}`} className="flex items-center gap-3 group">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 shrink-0">
                              {user.picture ? (
                                <img src={user.picture} alt={user.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-[#b91c1c] text-white font-bold">
                                  {user.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 group-hover:text-[#b91c1c] transition-colors">{user.name}</div>
                              {user.longest_streak > 0 && (
                                <div className="text-xs text-gray-400">Personal Best: {user.longest_streak} days</div>
                              )}
                            </div>
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="font-bold text-gray-900">{user.score}</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className={`inline-flex items-center gap-1 font-semibold px-2.5 py-1 rounded-full text-sm ${user.current_streak >= 3 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-600'}`}>
                            {user.current_streak >= 3 && <Flame className="w-3.5 h-3.5 fill-current" />}
                            {user.current_streak}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty State */}
          {leaders.length === 0 && (
            <div className="text-center py-16 bg-white rounded border shadow-sm">
              <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-600 mb-2">No Data Yet</h2>
              <p className="text-gray-500">Journalists will appear here once they start publishing articles.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
