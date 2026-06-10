/**
 * src/pages/student/StudentRewards.tsx
 * Student rewards and points leaderboard page
 */
import { useState } from 'react'
import { Zap, TrendingUp, Gift, Award, Loader2 } from 'lucide-react'
import { useAuth } from '../../lib/AuthContext'
import toast from 'react-hot-toast'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRewards } from '../../lib/api-client'

const AVAILABLE_REWARDS = [
  { id: 1, name: 'Movie Ticket', cost: 150, icon: '🎬' },
  { id: 2, name: 'Buffet Coupon', cost: 200, icon: '🍽️' },
  { id: 3, name: 'Pizza Voucher', cost: 100, icon: '🍕' },
  { id: 4, name: 'Free Laundry', cost: 50, icon: '🧺' },
  { id: 5, name: 'Study Material', cost: 300, icon: '📚' },
]

export function StudentRewards() {
  const { studentData, hostelId } = useAuth()
  const [redeeming, setRedeeming] = useState<string | null>(null)
  const queryClient = useQueryClient()

  // Fetch student's reward points
  const { data: rewardData } = useQuery({
    queryKey: ['student-rewards', studentData?.id],
    queryFn: async () => {
      if (!studentData?.id) return null
      const res = await apiRewards.getStudentRewards(studentData.id)
      return res.data
    },
    enabled: !!studentData?.id,
  })

  // Fetch leaderboard
  const { data: leaderboard, isLoading: leaderboardLoading } = useQuery({
    queryKey: ['rewards-leaderboard', hostelId],
    queryFn: async () => {
      if (!hostelId) return []
      const res = await apiRewards.getLeaderboard(hostelId, 'monthly')
      return res.data || []
    },
    enabled: !!hostelId,
  })

  const currentPoints = rewardData?.total_points || 0
  const history = rewardData?.history || []

  const handleRedeem = async (reward: typeof AVAILABLE_REWARDS[0]) => {
    if (currentPoints < reward.cost) {
      toast.error('Not enough points')
      return
    }

    setRedeeming(reward.id.toString())
    try {
      await apiRewards.redeem({
        student_id: studentData?.id || '',
        hostel_id: hostelId || '',
        points_cost: reward.cost,
        reward_name: reward.name,
      })
      
      toast.success(`${reward.name} redeemed! 🎉`)
      queryClient.invalidateQueries({ queryKey: ['student-rewards', studentData?.id] })
      queryClient.invalidateQueries({ queryKey: ['rewards-leaderboard', hostelId] })
    } catch (err: any) {
      toast.error(err.message || 'Redemption failed')
    } finally {
      setRedeeming(null)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Zap className="h-8 w-8 text-amber-500" /> Rewards & Points
          </h1>
          <p className="text-slate-400 mt-1">Earn points for good behavior. Redeem for rewards!</p>
        </div>
      </div>

      {/* Points Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current Points Card */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-8 border border-amber-200 shadow-sm">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-sm font-semibold text-amber-600 uppercase tracking-wider">Total Points</p>
              <h2 className="text-5xl font-black text-amber-900 mt-2">{currentPoints}</h2>
            </div>
            <div className="h-16 w-16 bg-amber-100 rounded-2xl flex items-center justify-center">
              <Zap className="h-8 w-8 text-amber-600" />
            </div>
          </div>
          <p className="text-sm text-amber-700">
            Earn more points by paying fees on time, maintaining attendance, and good conduct!
          </p>
        </div>

        {/* Leaderboard Position */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-200 shadow-sm">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider">Your Rank</p>
              <h2 className="text-5xl font-black text-blue-900 mt-2">
                #{leaderboard?.find((l: any) => l.id === studentData?.id)?.rank || '—'}
              </h2>
            </div>
            <div className="h-16 w-16 bg-blue-100 rounded-2xl flex items-center justify-center">
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <p className="text-sm text-blue-700">
            {leaderboard?.length || 0} students in this month's leaderboard
          </p>
        </div>
      </div>

      {/* Available Rewards */}
      <div>
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Gift className="h-6 w-6 text-emerald-500" /> Available Rewards
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {AVAILABLE_REWARDS.map((reward) => {
            const canRedeem = currentPoints >= reward.cost;
            return (
              <div
                key={reward.id}
                className={`rounded-xl border-2 p-4 text-center transition-all ${
                  canRedeem
                    ? 'border-emerald-200 bg-emerald-50 hover:shadow-lg'
                    : 'border-slate-200 bg-slate-50 opacity-60'
                }`}
              >
                <div className="text-4xl mb-2">{reward.icon}</div>
                <h4 className="font-semibold text-slate-900 mb-1">{reward.name}</h4>
                <p className="text-sm font-bold text-amber-600 mb-3">{reward.cost} pts</p>
                <button
                  onClick={() => handleRedeem(reward)}
                  disabled={!canRedeem || redeeming === reward.id.toString()}
                  className={`w-full py-2 rounded-lg font-semibold text-sm transition-all ${
                    canRedeem
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {redeeming === reward.id.toString() ? (
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  ) : (
                    'Redeem'
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Monthly Leaderboard */}
      <div>
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Award className="h-6 w-6 text-blue-400" /> Monthly Leaderboard
        </h3>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {leaderboardLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-slate-500">Loading leaderboard...</p>
            </div>
          ) : leaderboard && leaderboard.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Rank</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Student</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {leaderboard.map((entry: any, idx: number) => (
                    <tr
                      key={entry.id}
                      className={
                        entry.id === studentData?.id
                          ? 'bg-blue-50'
                          : idx % 2 === 0
                          ? 'bg-slate-50'
                          : ''
                      }
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {entry.rank === 1 && <span className="text-2xl">🥇</span>}
                          {entry.rank === 2 && <span className="text-2xl">🥈</span>}
                          {entry.rank === 3 && <span className="text-2xl">🥉</span>}
                          <span className="font-bold text-slate-900">#{entry.rank}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">{entry.full_name}</td>
                      <td className="px-6 py-4 text-right font-bold text-amber-600">{entry.total_points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500">
              No leaderboard data yet. Start earning points!
            </div>
          )}
        </div>
      </div>

      {/* Points History */}
      {history && history.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-white mb-3">Recent Activity</h3>
          <div className="space-y-2">
            {history.slice(0, 10).map((entry: any) => (
              <div key={entry.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-semibold text-slate-900">{entry.reason}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(entry.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`font-bold ${
                    entry.type === 'earned' ? 'text-emerald-600' : 'text-amber-600'
                  }`}
                >
                  {entry.type === 'earned' ? '+' : '-'}{entry.points}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
