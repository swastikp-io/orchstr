import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  AlertOctagon,
  Target,
  FlaskConical,
  RotateCw,
  Calendar,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { OperationalReviewReport } from '../../server/services/review-service';

interface OperationalReviewTabProps {
  companyId: string;
}

export const OperationalReviewTab: React.FC<OperationalReviewTabProps> = ({ companyId }) => {
  const [review, setReview] = useState<OperationalReviewReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReview();
  }, [companyId]);

  const loadReview = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/companies/${companyId}/review`);
      if (!res.ok) throw new Error('Failed to load operational review report');
      const data = await res.json();
      setReview(data);
    } catch (err: any) {
      setError(err.message || 'Error generating review');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center text-xs font-mono text-zinc-500">
        <RotateCw className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
        <span>Evaluating operating throughput & constraint analysis...</span>
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="p-6 rounded-xl border border-red-900/60 bg-red-950/20 text-red-300 text-xs">
        {error || 'Unable to load review'}
      </div>
    );
  }

  const { metrics, bottleneck_analysis, strategic_recommendation, proposed_experiment } = review;

  return (
    <div className="space-y-6">
      {/* Top Banner: Theory of Constraints */}
      <div className="rounded-xl border border-amber-500/30 bg-gradient-to-b from-amber-500/10 via-zinc-950 to-zinc-950 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Operating Phase: {strategic_recommendation.operating_loop_phase.toUpperCase()}
              </span>
              <span className="text-xs font-mono text-zinc-400">
                Operating Loop: Build ➔ Sell ➔ Observe ➔ Support ➔ Learn ➔ Iterate
              </span>
            </div>
            <h2 className="text-xl font-bold text-zinc-100 mt-2">
              Primary Bottleneck: {bottleneck_analysis.current_constraint}
            </h2>
          </div>

          <button
            onClick={loadReview}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-mono text-zinc-300 transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Regenerate Analysis</span>
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-zinc-950/80 border border-zinc-800">
            <div className="flex items-center space-x-2 text-xs font-mono uppercase text-amber-400 mb-1">
              <AlertOctagon className="w-4 h-4" />
              <span>Contributing Constraints</span>
            </div>
            <ul className="space-y-1.5 text-xs text-zinc-300 mt-2">
              {bottleneck_analysis.contributing_factors.map((f, i) => (
                <li key={i} className="flex items-start space-x-2">
                  <span className="text-amber-400 font-bold">•</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-4 rounded-lg bg-zinc-950/80 border border-zinc-800">
            <div className="flex items-center space-x-2 text-xs font-mono uppercase text-emerald-400 mb-1">
              <Target className="w-4 h-4" />
              <span>Recommended Single Priority</span>
            </div>
            <p className="text-xs font-semibold text-zinc-100 mt-1 leading-relaxed">
              {strategic_recommendation.single_priority}
            </p>
            <p className="text-[11px] text-zinc-400 mt-2 font-sans leading-relaxed">
              {strategic_recommendation.rationale}
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800">
          <span className="text-[10px] font-mono text-zinc-500 uppercase">Completion Rate</span>
          <div className="text-xl font-bold text-emerald-400 mt-1">{metrics.completion_rate_percent}%</div>
          <span className="text-[10px] font-mono text-zinc-400">{metrics.completed_tasks} / {metrics.total_tasks} tasks</span>
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800">
          <span className="text-[10px] font-mono text-zinc-500 uppercase">Blocked Tasks</span>
          <div className="text-xl font-bold text-amber-400 mt-1">{metrics.blocked_tasks_count}</div>
          <span className="text-[10px] font-mono text-zinc-400">Dependency delays</span>
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800">
          <span className="text-[10px] font-mono text-zinc-500 uppercase">Approval SLA</span>
          <div className="text-xl font-bold text-sky-400 mt-1">{metrics.avg_approval_turnaround_hours}h</div>
          <span className="text-[10px] font-mono text-zinc-400">Avg turnaround</span>
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800">
          <span className="text-[10px] font-mono text-zinc-500 uppercase">Artifact Revisions</span>
          <div className="text-xl font-bold text-indigo-400 mt-1">{metrics.artifact_revision_count}</div>
          <span className="text-[10px] font-mono text-zinc-400">Iterative updates</span>
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800">
          <span className="text-[10px] font-mono text-zinc-500 uppercase">Untested Hypotheses</span>
          <div className="text-xl font-bold text-purple-400 mt-1">{metrics.unresolved_assumptions_count}</div>
          <span className="text-[10px] font-mono text-zinc-400">Open assumptions</span>
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800">
          <span className="text-[10px] font-mono text-zinc-500 uppercase">Research Coverage</span>
          <div className="text-xl font-bold text-teal-400 mt-1">{metrics.research_source_coverage}%</div>
          <span className="text-[10px] font-mono text-zinc-400">Sourced evidence</span>
        </div>
      </div>

      {/* Two-Week Experiment Card */}
      <div className="rounded-xl border border-zinc-800 bg-[#0c0c10] p-6 space-y-4">
        <div className="flex items-center space-x-2 pb-3 border-b border-zinc-800">
          <FlaskConical className="w-5 h-5 text-indigo-400" />
          <h3 className="text-base font-bold text-zinc-100">Proposed Measurable Experiment</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <span className="text-[10px] font-mono uppercase text-zinc-500">Experiment Title</span>
              <p className="text-sm font-semibold text-zinc-200 mt-0.5">{proposed_experiment.title}</p>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-zinc-500">Testable Hypothesis</span>
              <p className="text-xs text-zinc-300 mt-0.5 font-sans leading-relaxed">{proposed_experiment.hypothesis}</p>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-zinc-500">Concrete Intervention</span>
              <p className="text-xs text-zinc-300 mt-0.5 font-sans leading-relaxed">{proposed_experiment.intervention}</p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 flex flex-col justify-between">
            <div className="space-y-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-zinc-500">Primary Success Metric</span>
                <div className="text-sm font-mono font-bold text-emerald-400 mt-0.5">{proposed_experiment.success_metric}</div>
              </div>
              <div className="flex items-center space-x-4 text-xs font-mono text-zinc-400">
                <div className="flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Owner: <strong className="text-zinc-200">{proposed_experiment.owner}</strong></span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Review: <strong className="text-zinc-200">{proposed_experiment.review_date}</strong></span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-900 text-[11px] font-mono text-zinc-500 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Experiment pre-vetted against active assumptions & operating loop.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
