import ProfileAvatar from "@/components/profile/ProfileAvatar";

export default function MessageBubble({
  sender,
  text,
}: {
  sender: string;
  text: string;
}) {
  return (
    <div className="flex gap-2 items-start">
      <ProfileAvatar uid={sender} />
      <div className="p-2 bg-gray-200 rounded-lg">{text}</div>
    </div>
  );
}
