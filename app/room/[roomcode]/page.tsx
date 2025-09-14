import RoomPage from "@/components/RoomPageContent";

interface RoomPageProps {
  params: {
    roomcode: string;
  };
}

export default function Room({ params }: RoomPageProps) {
  const { roomcode } = params;
  return <RoomPage roomCode={roomcode} />;
}
