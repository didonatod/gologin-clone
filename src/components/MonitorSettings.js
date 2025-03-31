import React from 'react';
import {
    VStack,
    HStack,
    FormControl,
    FormLabel,
    Switch,
    NumberInput,
    NumberInputField,
    NumberInputStepper,
    NumberIncrementStepper,
    NumberDecrementStepper,
    Select,
    Slider,
    SliderTrack,
    SliderFilledTrack,
    SliderThumb,
    Text,
    Box,
    Tooltip,
    IconButton,
    Button
} from '@chakra-ui/react';
import { FaInfoCircle, FaTrash, FaPlus } from 'react-icons/fa';

export function MonitorSettings({ settings, updateSetting, availableSections }) {
    return (
        <VStack spacing={4} align="stretch">
            <FormControl>
                <HStack justify="space-between">
                    <FormLabel>Purchase Strategy</FormLabel>
                    <Tooltip label="Choose how the monitor should attempt purchases">
                        <IconButton
                            size="sm"
                            icon={<FaInfoCircle />}
                            aria-label="Purchase strategy info"
                        />
                    </Tooltip>
                </HStack>
                <Select
                    value={settings.purchaseStrategy}
                    onChange={(e) => updateSetting('purchaseStrategy', e.target.value)}
                >
                    <option value="fastest">Fastest Available</option>
                    <option value="bestPrice">Best Price</option>
                    <option value="bestValue">Best Value</option>
                    <option value="specific">Specific Section</option>
                </Select>
            </FormControl>

            <FormControl>
                <FormLabel>Price Range</FormLabel>
                <HStack>
                    <NumberInput
                        value={settings.minPrice}
                        onChange={(value) => updateSetting('minPrice', Number(value))}
                        min={0}
                    >
                        <NumberInputField placeholder="Min" />
                        <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                        </NumberInputStepper>
                    </NumberInput>
                    <Text>-</Text>
                    <NumberInput
                        value={settings.maxPrice}
                        onChange={(value) => updateSetting('maxPrice', Number(value))}
                        min={0}
                    >
                        <NumberInputField placeholder="Max" />
                        <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                        </NumberInputStepper>
                    </NumberInput>
                </HStack>
            </FormControl>

            <FormControl>
                <FormLabel>Monitor Frequency</FormLabel>
                <Box px={2}>
                    <Slider
                        value={settings.checkInterval}
                        onChange={(value) => updateSetting('checkInterval', value)}
                        min={1}
                        max={10}
                        step={0.5}
                    >
                        <SliderTrack>
                            <SliderFilledTrack />
                        </SliderTrack>
                        <SliderThumb boxSize={6} />
                    </Slider>
                </Box>
                <Text textAlign="right">{settings.checkInterval}s</Text>
            </FormControl>

            <FormControl display="flex" alignItems="center">
                <FormLabel mb="0">Auto Purchase</FormLabel>
                <Switch
                    isChecked={settings.autoPurchase}
                    onChange={(e) => updateSetting('autoPurchase', e.target.checked)}
                />
            </FormControl>

            {settings.autoPurchase && (
                <VStack spacing={3} pl={6}>
                    <FormControl>
                        <FormLabel>Max Attempts</FormLabel>
                        <NumberInput
                            value={settings.maxAttempts}
                            onChange={(value) => updateSetting('maxAttempts', Number(value))}
                            min={1}
                            max={10}
                        >
                            <NumberInputField />
                            <NumberInputStepper>
                                <NumberIncrementStepper />
                                <NumberDecrementStepper />
                            </NumberInputStepper>
                        </NumberInput>
                    </FormControl>
                </VStack>
            )}

            <FormControl display="flex" alignItems="center">
                <FormLabel mb="0">Price Drop Alerts</FormLabel>
                <Switch
                    isChecked={settings.priceAlerts}
                    onChange={(e) => updateSetting('priceAlerts', e.target.checked)}
                />
            </FormControl>

            {settings.priceAlerts && (
                <VStack spacing={3} pl={6}>
                    <FormControl>
                        <FormLabel>Alert Threshold ($)</FormLabel>
                        <NumberInput
                            value={settings.alertThreshold}
                            onChange={(value) => updateSetting('alertThreshold', Number(value))}
                            min={0}
                        >
                            <NumberInputField />
                            <NumberInputStepper>
                                <NumberIncrementStepper />
                                <NumberDecrementStepper />
                            </NumberInputStepper>
                        </NumberInput>
                    </FormControl>
                </VStack>
            )}

            <FormControl>
                <FormLabel>Section Preferences</FormLabel>
                <VStack spacing={2} align="stretch">
                    {settings.sections?.map((section, index) => (
                        <HStack key={index}>
                            <Select
                                value={section.id}
                                onChange={(e) => updateSetting('sections', [
                                    ...settings.sections.slice(0, index),
                                    { ...section, id: e.target.value },
                                    ...settings.sections.slice(index + 1)
                                ])}
                            >
                                <option value="">Select Section</option>
                                {availableSections.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </Select>
                            <NumberInput
                                value={section.priority}
                                onChange={(value) => updateSetting('sections', [
                                    ...settings.sections.slice(0, index),
                                    { ...section, priority: Number(value) },
                                    ...settings.sections.slice(index + 1)
                                ])}
                                min={1}
                                max={10}
                            >
                                <NumberInputField placeholder="Priority" />
                                <NumberInputStepper>
                                    <NumberIncrementStepper />
                                    <NumberDecrementStepper />
                                </NumberInputStepper>
                            </NumberInput>
                            <IconButton
                                icon={<FaTrash />}
                                onClick={() => updateSetting('sections', 
                                    settings.sections.filter((_, i) => i !== index)
                                )}
                                aria-label="Remove section"
                                colorScheme="red"
                                size="sm"
                            />
                        </HStack>
                    ))}
                    <Button
                        leftIcon={<FaPlus />}
                        onClick={() => updateSetting('sections', [
                            ...settings.sections,
                            { id: '', priority: 1 }
                        ])}
                        size="sm"
                    >
                        Add Section
                    </Button>
                </VStack>
            </FormControl>

            <FormControl>
                <FormLabel>Advanced Settings</FormLabel>
                <VStack spacing={3} align="stretch">
                    <HStack>
                        <FormLabel fontSize="sm">Retry Delay (ms)</FormLabel>
                        <NumberInput
                            value={settings.retryDelay}
                            onChange={(value) => updateSetting('retryDelay', Number(value))}
                            min={100}
                            max={5000}
                            step={100}
                        >
                            <NumberInputField />
                            <NumberInputStepper>
                                <NumberIncrementStepper />
                                <NumberDecrementStepper />
                            </NumberInputStepper>
                        </NumberInput>
                    </HStack>
                    
                    <HStack>
                        <FormLabel fontSize="sm">Concurrent Attempts</FormLabel>
                        <NumberInput
                            value={settings.concurrentAttempts}
                            onChange={(value) => updateSetting('concurrentAttempts', Number(value))}
                            min={1}
                            max={5}
                        >
                            <NumberInputField />
                            <NumberInputStepper>
                                <NumberIncrementStepper />
                                <NumberDecrementStepper />
                            </NumberInputStepper>
                        </NumberInput>
                    </HStack>

                    <FormControl display="flex" alignItems="center">
                        <FormLabel mb="0" fontSize="sm">Smart Retry</FormLabel>
                        <Tooltip label="Automatically adjust retry timing based on server response">
                            <Switch
                                isChecked={settings.smartRetry}
                                onChange={(e) => updateSetting('smartRetry', e.target.checked)}
                            />
                        </Tooltip>
                    </FormControl>
                </VStack>
            </FormControl>

            <FormControl>
                <FormLabel>Performance Optimization</FormLabel>
                <VStack spacing={3} align="stretch">
                    <FormControl display="flex" alignItems="center">
                        <FormLabel mb="0" fontSize="sm">Dynamic Timing</FormLabel>
                        <Tooltip label="Automatically adjust check timing based on server load">
                            <Switch
                                isChecked={settings.dynamicTiming}
                                onChange={(e) => updateSetting('dynamicTiming', e.target.checked)}
                            />
                        </Tooltip>
                    </FormControl>

                    <FormControl display="flex" alignItems="center">
                        <FormLabel mb="0" fontSize="sm">Load Balancing</FormLabel>
                        <Tooltip label="Distribute requests across multiple servers">
                            <Switch
                                isChecked={settings.loadBalancing}
                                onChange={(e) => updateSetting('loadBalancing', e.target.checked)}
                            />
                        </Tooltip>
                    </FormControl>

                    <FormControl>
                        <FormLabel fontSize="sm">Request Timeout (ms)</FormLabel>
                        <NumberInput
                            value={settings.requestTimeout}
                            onChange={(value) => updateSetting('requestTimeout', Number(value))}
                            min={1000}
                            max={10000}
                            step={500}
                        >
                            <NumberInputField />
                            <NumberInputStepper>
                                <NumberIncrementStepper />
                                <NumberDecrementStepper />
                            </NumberInputStepper>
                        </NumberInput>
                    </FormControl>

                    <FormControl>
                        <FormLabel fontSize="sm">Error Threshold</FormLabel>
                        <Slider
                            value={settings.errorThreshold}
                            onChange={(value) => updateSetting('errorThreshold', value)}
                            min={1}
                            max={10}
                        >
                            <SliderTrack>
                                <SliderFilledTrack />
                            </SliderTrack>
                            <SliderThumb boxSize={6} />
                        </Slider>
                        <Text textAlign="right">{settings.errorThreshold} errors before pause</Text>
                    </FormControl>

                    <FormControl>
                        <FormLabel fontSize="sm">Recovery Strategy</FormLabel>
                        <Select
                            value={settings.recoveryStrategy}
                            onChange={(e) => updateSetting('recoveryStrategy', e.target.value)}
                            size="sm"
                        >
                            <option value="immediate">Immediate Retry</option>
                            <option value="exponential">Exponential Backoff</option>
                            <option value="linear">Linear Backoff</option>
                            <option value="manual">Manual Recovery</option>
                        </Select>
                    </FormControl>
                </VStack>
            </FormControl>
        </VStack>
    );
} 