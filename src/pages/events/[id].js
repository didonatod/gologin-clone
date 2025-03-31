import { Container, VStack } from '@chakra-ui/react';
import { TicketMonitoring } from '@/components/TicketMonitoring';
import { useProfile } from '@/hooks/useProfile';
import { EventDetails } from '@/components/EventDetails';

export default function EventPage({ eventData }) {
    const { profile } = useProfile();

    return (
        <Container maxW="container.xl">
            <VStack spacing={8}>
                <EventDetails event={eventData} />
                <TicketMonitoring 
                    profile={profile}
                    eventUrl={eventData.url}
                />
            </VStack>
        </Container>
    );
} 