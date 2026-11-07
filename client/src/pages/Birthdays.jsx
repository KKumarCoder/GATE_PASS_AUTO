import BirthdayAutomation from '../components/BirthdayAutomation';
import {PageTitle} from '../components/UI';

export default function Birthdays() {
  return <div className="birthday-page">
    <PageTitle eyebrow="CELEBRATE YOUR SCHOOL FAMILY" title="Birthday Wishes" description="Celebrate student birthdays with personalised WhatsApp cards from your school." />
    <BirthdayAutomation />
  </div>;
}
