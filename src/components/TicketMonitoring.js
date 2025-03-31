import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@chakra-ui/react';
import TicketMonitor from '../services/TicketMonitor';
import {
    Box,
    Button,
    VStack,
    Text,
    Heading,
    Progress,
    Badge,
    HStack,
    Slider,
    SliderTrack,
    SliderFilledTrack,
    SliderThumb,
    Switch,
    FormControl,
    FormLabel,
    NumberInput,
    NumberInputField,
    NumberInputStepper,
    NumberIncrementStepper,
    NumberDecrementStepper,
} from '@chakra-ui/react';

const TicketMonitoring = ({ profile, eventUrl }) => {
    const [isMonitoring, setIsMonitoring] = useState(false);
    const [status, setStatus] = useState('Ready');
    const [monitor, setMonitor] = useState(null);
    const [settings, setSettings] = useState({
        maxPrice: 200,
        checkInterval: 2,
        autoRetry: true,
        notifyOnPrice: true,
        priceThreshold: 150
    });
    const toast = useToast();

    useEffect(() => {
        // Cleanup on unmount
        return () => {
            if (monitor) {
                stopMonitoring();
            }
        };
    }, []);

    const updateSetting = (key, value) => {
        setSettings(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const renderSettings = () => (
        <VStack spacing={4} align="stretch" mt={4}>
            <FormControl>
                <FormLabel>Max Price ($)</FormLabel>
                <NumberInput
                    value={settings.maxPrice}
                    onChange={(value) => updateSetting('maxPrice', Number(value))}
                    min={0}
                >
                    <NumberInputField />
                    <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                    </NumberInputStepper>
                </NumberInput>
            </FormControl>

            <FormControl>
                <FormLabel>Check Interval (seconds)</FormLabel>
                <Slider
                    value={settings.checkInterval}
                    onChange={(value) => updateSetting('checkInterval', value)}
                    min={1}
                    max={10}
                >
                    <SliderTrack>
                        <SliderFilledTrack />
                    </SliderTrack>
                    <SliderThumb />
                </Slider>
                <Text textAlign="right">{settings.checkInterval}s</Text>
            </FormControl>

            <FormControl display="flex" alignItems="center">
                <FormLabel mb="0">Auto Retry on Error</FormLabel>
                <Switch
                    isChecked={settings.autoRetry}
                    onChange={(e) => updateSetting('autoRetry', e.target.checked)}
                />
            </FormControl>

            <FormControl display="flex" alignItems="center">
                <FormLabel mb="0">Notify on Price Drop</FormLabel>
                <Switch
                    isChecked={settings.notifyOnPrice}
                    onChange={(e) => updateSetting('notifyOnPrice', e.target.checked)}
                />
            </FormControl>

            {settings.notifyOnPrice && (
                <FormControl>
                    <FormLabel>Price Threshold ($)</FormLabel>
                    <NumberInput
                        value={settings.priceThreshold}
                        onChange={(value) => updateSetting('priceThreshold', Number(value))}
                        min={0}
                    >
                        <NumberInputField />
                        <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                        </NumberInputStepper>
                    </NumberInput>
                </FormControl>
            )}
        </VStack>
    );

    const startMonitoring = async () => {
        try {
            setIsMonitoring(true);
            const newMonitor = new TicketMonitor(profile);
            setMonitor(newMonitor);
            setStatus('Checking for tickets...');

            while (isMonitoring) {
                const result = await newMonitor.checkTickets(eventUrl);
                
                if (result.available) {
                    setStatus('Tickets found! Attempting purchase...');
                    
                    const purchase = await newMonitor.initiatePurchase(result);
                    
                    if (purchase.success) {
                        toast({
                            title: 'Purchase Successful!',
                            description: `Confirmation: ${purchase.confirmationNumber}`,
                            status: 'success',
                            duration: 9000,
                            isClosable: true,
                        });
                        stopMonitoring();
                        break;
                    }
                }
                
                // Wait before next check
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        } catch (error) {
            console.error('Monitoring error:', error);
            toast({
                title: 'Error',
                description: error.message,
                status: 'error',
                duration: 9000,
                isClosable: true,
            });
            stopMonitoring();
        }
    };

    const stopMonitoring = () => {
        setIsMonitoring(false);
        setStatus('Stopped');
        if (monitor) {
            // Clean up monitor resources if needed
            setMonitor(null);
        }
    };

    return (
        <Box p={4} borderWidth="1px" borderRadius="lg">
            <VStack spacing={4} align="stretch">
                <HStack justify="space-between">
                    <Text fontWeight="bold">Ticket Monitor</Text>
                    <Badge colorScheme={isMonitoring ? 'green' : 'gray'}>
                        {status}
                    </Badge>
                </HStack>

                {renderSettings()}

                <Button
                    colorScheme={isMonitoring ? 'red' : 'green'}
                    onClick={isMonitoring ? stopMonitoring : startMonitoring}
                >
                    {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
                </Button>

                {isMonitoring && (
                    <Progress size="xs" isIndeterminate />
                )}
            </VStack>
        </Box>
    );
};

export default TicketMonitoring; 