import React from 'react';
import {
    Box,
    VStack,
    Button,
    Text,
    useToast,
    Container
} from '@chakra-ui/react';
import { TicketMonitoring } from '@/components/TicketMonitoring';

export default function MonitorPage() {
    return (
        <Container maxW="container.xl" py={8}>
            <VStack spacing={6}>
                <Box p={6} borderWidth="1px" borderRadius="lg" width="100%">
                    <Text fontSize="xl" fontWeight="bold" mb={4}>
                        Ticket Monitor
                    </Text>
                    
                    <TicketMonitoring />
                </Box>
            </VStack>
        </Container>
    );
} 