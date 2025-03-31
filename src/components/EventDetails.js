import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Heading,
    Text,
    Stack,
    Badge,
    Image,
    Button,
    HStack,
    VStack,
    useDisclosure,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    IconButton,
    Tooltip,
    Skeleton,
    Alert,
    AlertIcon,
    Progress
} from '@chakra-ui/react';
import { FaShare, FaHeart, FaBell, FaMapMarkerAlt, FaCalendar, FaTicketAlt, FaChartLine, FaHistory, FaUsers } from 'react-icons/fa';
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip } from 'recharts';

export function EventDetails({ event }) {
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [isLoading, setIsLoading] = useState(false);
    const [isFavorite, setIsFavorite] = useState(false);
    const [isNotifying, setIsNotifying] = useState(false);
    const [ticketHistory, setTicketHistory] = useState([]);
    const [priceAnalytics, setPriceAnalytics] = useState(null);
    const [demandTrend, setDemandTrend] = useState(null);

    if (!event) return <EventDetailsSkeleton />;

    const handleShare = async () => {
        try {
            await navigator.share({
                title: event.name,
                text: event.description,
                url: event.url
            });
        } catch (err) {
            console.error('Share failed:', err);
        }
    };

    const toggleFavorite = async () => {
        setIsFavorite(!isFavorite);
        // Implement favorite API call
    };

    const toggleNotifications = async () => {
        setIsNotifying(!isNotifying);
        // Implement notifications API call
    };

    const loadTicketHistory = async () => {
        setIsLoading(true);
        try {
            // Implement ticket history API call
            const response = await fetch(`/api/events/${event.id}/history`);
            const data = await response.json();
            setTicketHistory(data);
        } catch (err) {
            console.error('Failed to load history:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const loadAnalytics = useCallback(async () => {
        try {
            const response = await fetch(`/api/events/${event.id}/analytics`);
            const data = await response.json();
            setPriceAnalytics(data.prices);
            setDemandTrend(data.demand);
        } catch (err) {
            console.error('Failed to load analytics:', err);
        }
    }, [event.id]);

    useEffect(() => {
        loadAnalytics();
    }, [loadAnalytics]);

    const renderAnalytics = () => (
        <Box mt={4}>
            <Heading size="md" mb={4}>Price Analytics</Heading>
            {priceAnalytics ? (
                <LineChart width={600} height={300} data={priceAnalytics}>
                    <XAxis dataKey="date" />
                    <YAxis />
                    <RechartsTooltip />
                    <Line type="monotone" dataKey="price" stroke="#8884d8" />
                </LineChart>
            ) : (
                <Skeleton height="300px" />
            )}
        </Box>
    );

    const renderDemandPrediction = () => (
        <Box mt={4} p={4} borderWidth="1px" borderRadius="md">
            <Heading size="sm" mb={2}>Demand Prediction</Heading>
            <HStack spacing={4}>
                <VStack align="start">
                    <Text>Expected Sell Out</Text>
                    <Badge colorScheme={demandTrend?.sellOutLikelihood > 0.7 ? 'red' : 'green'}>
                        {Math.round(demandTrend?.sellOutLikelihood * 100)}% Likely
                    </Badge>
                </VStack>
                <VStack align="start">
                    <Text>Best Time to Buy</Text>
                    <Text fontWeight="bold">{demandTrend?.bestTimeToBuy || 'Now'}</Text>
                </VStack>
            </HStack>
        </Box>
    );

    return (
        <Box p={6} borderWidth="1px" borderRadius="lg" width="100%" position="relative">
            {event.status === 'Selling Fast' && (
                <Progress 
                    size="xs" 
                    colorScheme="red" 
                    isIndeterminate 
                    position="absolute" 
                    top={0} 
                    left={0} 
                    right={0} 
                />
            )}
            
            <Stack spacing={4}>
                <HStack justify="space-between" align="flex-start">
                    <Stack>
                        <Heading size="lg">{event.name}</Heading>
                        <HStack>
                            <FaCalendar />
                            <Text color="gray.600">{event.date}</Text>
                        </HStack>
                    </Stack>
                    <HStack>
                        <Tooltip label="Share Event">
                            <IconButton
                                icon={<FaShare />}
                                onClick={handleShare}
                                aria-label="Share"
                            />
                        </Tooltip>
                        <Tooltip label={isFavorite ? "Remove from Favorites" : "Add to Favorites"}>
                            <IconButton
                                icon={<FaHeart />}
                                onClick={toggleFavorite}
                                aria-label="Favorite"
                                colorScheme={isFavorite ? "red" : "gray"}
                            />
                        </Tooltip>
                        <Tooltip label={isNotifying ? "Disable Notifications" : "Enable Notifications"}>
                            <IconButton
                                icon={<FaBell />}
                                onClick={toggleNotifications}
                                aria-label="Notifications"
                                colorScheme={isNotifying ? "blue" : "gray"}
                            />
                        </Tooltip>
                    </HStack>
                </HStack>

                {event.status && (
                    <Badge 
                        colorScheme={
                            event.status === 'On Sale' ? 'green' : 
                            event.status === 'Selling Fast' ? 'red' : 
                            'orange'
                        }
                        fontSize="md"
                        px={2}
                        py={1}
                    >
                        {event.status}
                    </Badge>
                )}

                {event.image && (
                    <Box position="relative">
                        <Image
                            src={event.image}
                            alt={event.name}
                            borderRadius="md"
                            maxH="300px"
                            objectFit="cover"
                        />
                        {event.virtualEvent && (
                            <Badge
                                position="absolute"
                                top={2}
                                right={2}
                                colorScheme="purple"
                            >
                                Virtual Event
                            </Badge>
                        )}
                    </Box>
                )}

                <Stack spacing={2}>
                    <HStack>
                        <FaMapMarkerAlt />
                        <Text fontSize="lg" fontWeight="bold">
                            Venue: {event.venue}
                        </Text>
                    </HStack>
                    <Text>{event.description}</Text>
                </Stack>

                <HStack spacing={4}>
                    <VStack align="start">
                        <Text fontWeight="bold">
                            Price Range
                        </Text>
                        <Text>
                            ${event.minPrice} - ${event.maxPrice}
                        </Text>
                    </VStack>
                    <VStack align="start">
                        <Text fontWeight="bold">
                            Available Tickets
                        </Text>
                        <Text>
                            {event.availableTickets}
                        </Text>
                    </VStack>
                    {event.soldPercentage && (
                        <Box w="100%">
                            <Text fontSize="sm">Sold: {event.soldPercentage}%</Text>
                            <Progress 
                                value={event.soldPercentage} 
                                colorScheme={event.soldPercentage > 80 ? "red" : "blue"} 
                            />
                        </Box>
                    )}
                </HStack>

                <HStack spacing={4}>
                    {event.url && (
                        <Button 
                            leftIcon={<FaTicketAlt />}
                            as="a" 
                            href={event.url} 
                            target="_blank"
                            colorScheme="blue"
                        >
                            View on Ticket Site
                        </Button>
                    )}
                    <Button
                        onClick={() => {
                            loadTicketHistory();
                            onOpen();
                        }}
                    >
                        View Price History
                    </Button>
                </HStack>
            </Stack>

            {renderAnalytics()}
            {renderDemandPrediction()}

            <Modal isOpen={isOpen} onClose={onClose} size="xl">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Ticket Price History</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        {isLoading ? (
                            <Stack>
                                <Skeleton height="20px" />
                                <Skeleton height="20px" />
                                <Skeleton height="20px" />
                            </Stack>
                        ) : ticketHistory.length > 0 ? (
                            <Table variant="simple">
                                <Thead>
                                    <Tr>
                                        <Th>Date</Th>
                                        <Th>Price Range</Th>
                                        <Th>Available</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {ticketHistory.map((history, index) => (
                                        <Tr key={index}>
                                            <Td>{history.date}</Td>
                                            <Td>${history.minPrice} - ${history.maxPrice}</Td>
                                            <Td>{history.available}</Td>
                                        </Tr>
                                    ))}
                                </Tbody>
                            </Table>
                        ) : (
                            <Alert status="info">
                                <AlertIcon />
                                No price history available
                            </Alert>
                        )}
                    </ModalBody>
                </ModalContent>
            </Modal>
        </Box>
    );
}

function EventDetailsSkeleton() {
    return (
        <Box p={6} borderWidth="1px" borderRadius="lg" width="100%">
            <Stack spacing={4}>
                <Skeleton height="40px" width="60%" />
                <Skeleton height="20px" width="40%" />
                <Skeleton height="200px" />
                <Stack spacing={2}>
                    <Skeleton height="24px" width="30%" />
                    <Skeleton height="60px" />
                </Stack>
                <HStack spacing={4}>
                    <Skeleton height="20px" width="100px" />
                    <Skeleton height="20px" width="100px" />
                </HStack>
                <Skeleton height="40px" width="150px" />
            </Stack>
        </Box>
    );
} 