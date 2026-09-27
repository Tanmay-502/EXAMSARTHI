import { redirect } from 'next/navigation';
import { fetchAnalyticsData } from './actions';
import AnalysisVoiceHandler from './AnalysisVoiceHandler';
import AnalysisPageContent from './AnalysisPageContent';

export const metadata = {
  title: 'Analysis - ExamSaarthi',
  description: 'Detailed analysis of your exam and practice performance',
};

export default async function AnalysisPage() {
  const data = await fetchAnalyticsData();

  if (!data) {
    redirect('/auth/login');
  }

  return (
    <>
      <AnalysisVoiceHandler data={data} />
      <AnalysisPageContent data={data} />
    </>
  );
}
