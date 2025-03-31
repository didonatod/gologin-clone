import React, { useState, useEffect } from 'react';
import {
    Box,
    Container,
    VStack,
    HStack,
    Text,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Badge,
    Button,
    useToast,
    Stat,
    StatLabel,
    StatNumber,
    StatHelpText,
    StatArrow,
    Grid,
    GridItem
} from '@chakra-ui/react';

export default function Dashboard() {
    const [monitoredEvents, setMonitoredEvents] = useState([]);
    const [stats, setStats] = useState({});
    const toast = useToast();

    useEffect(() => {
        // Load monitored events from storage
        loadMonitoredEvents();
        // Set up real-time updates
        const interval = setInterval(updateStats, 5000);
        return () => clearInterval(interval);
    }, []);

    const loadMonitoredEvents = async () => {
        try {
            const events = await chrome.storage.sync.get('monitoredEvents');
            setMonitoredEvents(events.monitoredEvents || []);
        } catch (error) {
            console.error('Failed to load events:', error);
        }
    };

    const updateStats = async () => {
        // Update stats for each monitored event
        const newStats = {};
        for (const event of monitoredEvents) {
            try {
                const response = await fetch(`/api/events/${event.id}/stats`);
                newStats[event.id] = await response.json();
            } catch (error) {
                console.error(`Failed to update stats for event ${event.id}:`, error);
            }
        }
        setStats(newStats);
    };

    return (
        <Container maxW="container.xl" py={8}>
            <VStack spacing={8}>
                <Grid templateColumns="repeat(4, 1fr)" gap={6} w="100%">
                    <GridItem>
                        <Stat>
                            <StatLabel>Active Monitors</StatLabel>
                            <StatNumber>{monitoredEvents.length}</StatNumber>
                        </Stat>
                    </GridItem>
                    <GridItem>
                        <Stat>
                            <StatLabel>Success Rate</StatLabel>
                            <StatNumber>
                                {calculateSuccessRate(stats)}%
                            </StatNumber>
                        </Stat>
                    </GridItem>
                    <GridItem>
                        <Stat>
                            <StatLabel>Tickets Found</StatLabel>
                            <StatNumber>{calculateTotalTickets(stats)}</StatNumber>
                        </Stat>
                    </GridItem>
                    <GridItem>
                        <Stat>
                            <StatLabel>Avg Response Time</StatLabel>
                            <StatNumber>{calculateAvgResponseTime(stats)}s</StatNumber>
                        </Stat>
                    </GridItem>
                </Grid>

                <Table variant="simple">
                    <Thead>
                        <Tr>
                            <Th>Event</Th>
                            <Th>Status</Th>
                            <Th>Last Check</Th>
                            <Th>Tickets Found</Th>
                            <Th>Price Range</Th>
                            <Th>Actions</Th>
                        </Tr>
                    </Thead>
                    <Tbody>
                        {monitoredEvents.map(event => (
                            <Tr key={event.id}>
                                <Td>{event.name}</Td>
                                <Td>
                                    <Badge 
                                        colorScheme={
                                            stats[event.id]?.active ? "green" : "red"
                                        }
                                    >
                                        {stats[event.id]?.active ? "Active" : "Inactive"}
                                    </Badge>
                                </Td>
                                <Td>{stats[event.id]?.lastCheck || 'N/A'}</Td>
                                <Td>{stats[event.id]?.ticketsFound || 0}</Td>
                                <Td>
                                    ${stats[event.id]?.minPrice || 0} - 
                                    ${stats[event.id]?.maxPrice || 0}
                                </Td>
                                <Td>
                                    <HStack spacing={2}>
                                        <Button 
                                            size="sm"
                                            onClick={() => toggleMonitor(event.id)}
                                        >
                                            {stats[event.id]?.active ? 
                                                "Stop" : "Start"}
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            colorScheme="red"
                                            onClick={() => removeEvent(event.id)}
                                        >
                                            Remove
                                        </Button>
                                    </HStack>
                                </Td>
                            </Tr>
                        ))}
                    </Tbody>
                </Table>
            </VStack>
        </Container>
    );
} 