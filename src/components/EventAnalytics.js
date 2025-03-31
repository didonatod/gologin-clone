import React from 'react';
import {
    Box,
    Heading,
    Text,
    VStack,
    HStack,
    Badge,
    Stat,
    StatLabel,
    StatNumber,
    StatHelpText,
    StatArrow,
    Tabs,
    TabList,
    TabPanels,
    Tab,
    TabPanel,
} from '@chakra-ui/react';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    AreaChart,
    Area,
    ScatterChart,
    Scatter,
    PieChart,
    Pie,
    Cell
} from 'recharts';

export function EventAnalytics({ analytics }) {
    if (!analytics) return null;

    return (
        <Box mt={6}>
            <Tabs>
                <TabList>
                    <Tab>Price Trends</Tab>
                    <Tab>Volume Analysis</Tab>
                    <Tab>Predictions</Tab>
                    <Tab>Success Rate</Tab>
                    <Tab>Section Analysis</Tab>
                    <Tab>Time Analysis</Tab>
                    <Tab>Failure Analysis</Tab>
                </TabList>

                <TabPanels>
                    <TabPanel>
                        <VStack spacing={4} align="stretch">
                            <Heading size="md">Price Trends</Heading>
                            <Box h="300px">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={analytics.prices}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Line 
                                            type="monotone" 
                                            dataKey="price" 
                                            stroke="#8884d8" 
                                            name="Price ($)"
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </Box>
                        </VStack>
                    </TabPanel>

                    <TabPanel>
                        <VStack spacing={4} align="stretch">
                            <Heading size="md">Trading Volume</Heading>
                            <Box h="300px">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={analytics.prices}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Bar 
                                            dataKey="volume" 
                                            fill="#82ca9d" 
                                            name="Volume"
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Box>
                        </VStack>
                    </TabPanel>

                    <TabPanel>
                        <VStack spacing={6}>
                            <HStack spacing={8} width="100%">
                                <Stat>
                                    <StatLabel>Sell Out Likelihood</StatLabel>
                                    <StatNumber>
                                        {Math.round(analytics.demand.sellOutLikelihood * 100)}%
                                    </StatNumber>
                                    <StatHelpText>
                                        <Badge 
                                            colorScheme={
                                                analytics.demand.sellOutLikelihood > 0.7 
                                                    ? 'red' 
                                                    : 'green'
                                            }
                                        >
                                            High Demand
                                        </Badge>
                                    </StatHelpText>
                                </Stat>

                                <Stat>
                                    <StatLabel>Price Direction</StatLabel>
                                    <StatNumber>
                                        <StatArrow 
                                            type={
                                                analytics.demand.priceDirection === 'increasing'
                                                    ? 'increase'
                                                    : 'decrease'
                                            }
                                        />
                                        {analytics.demand.priceDirection}
                                    </StatNumber>
                                    <StatHelpText>
                                        {Math.round(analytics.demand.confidence * 100)}% confidence
                                    </StatHelpText>
                                </Stat>
                            </HStack>

                            <Box 
                                p={4} 
                                borderWidth="1px" 
                                borderRadius="md" 
                                bg="blue.50"
                            >
                                <Text fontWeight="bold">
                                    Recommendation:
                                </Text>
                                <Text>
                                    Best time to buy: {analytics.demand.bestTimeToBuy}
                                </Text>
                            </Box>
                        </VStack>
                    </TabPanel>

                    <TabPanel>
                        <VStack spacing={4} align="stretch">
                            <Heading size="md">Purchase Success Rate</Heading>
                            <Box h="300px">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: 'Success', value: analytics.successRate || 0 },
                                                { name: 'Failed', value: 100 - (analytics.successRate || 0) }
                                            ]}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                        >
                                            <Cell fill="#48BB78" />
                                            <Cell fill="#F56565" />
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </Box>
                            <Text textAlign="center" fontWeight="bold">
                                Success Rate: {analytics.successRate}%
                            </Text>
                        </VStack>
                    </TabPanel>

                    <TabPanel>
                        <VStack spacing={4} align="stretch">
                            <Heading size="md">Section Price Distribution</Heading>
                            <Box h="300px">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ScatterChart>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="section" />
                                        <YAxis dataKey="price" />
                                        <Tooltip />
                                        <Legend />
                                        <Scatter
                                            data={analytics.sectionPrices || []}
                                            fill="#8884d8"
                                            name="Section Prices"
                                        />
                                    </ScatterChart>
                                </ResponsiveContainer>
                            </Box>
                        </VStack>
                    </TabPanel>

                    <TabPanel>
                        <VStack spacing={4} align="stretch">
                            <Heading size="md">Purchase Time Analysis</Heading>
                            <Box h="300px">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={analytics.timeAnalysis}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="hour" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Area 
                                            type="monotone" 
                                            dataKey="successRate" 
                                            stroke="#82ca9d" 
                                            fill="#82ca9d" 
                                            name="Success Rate (%)"
                                        />
                                        <Area 
                                            type="monotone" 
                                            dataKey="avgPurchaseTime" 
                                            stroke="#8884d8" 
                                            fill="#8884d8" 
                                            name="Avg Purchase Time (s)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </Box>
                        </VStack>
                    </TabPanel>

                    <TabPanel>
                        <VStack spacing={4} align="stretch">
                            <Heading size="md">Failure Analysis</Heading>
                            <Box h="300px">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: 'Sold Out', value: analytics.failureReasons?.soldOut || 0 },
                                                { name: 'Error', value: analytics.failureReasons?.error || 0 },
                                                { name: 'Timeout', value: analytics.failureReasons?.timeout || 0 }
                                            ]}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                        >
                                            <Cell fill="#FC8181" />
                                            <Cell fill="#F6AD55" />
                                            <Cell fill="#63B3ED" />
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </Box>
                            <Box p={4} borderWidth="1px" borderRadius="md">
                                <Text fontWeight="bold">Analysis Summary:</Text>
                                <Text>Most common failure: {analytics.mostCommonFailure}</Text>
                                <Text>Average response time: {analytics.averageResponseTime}s</Text>
                                <Text>System uptime: {analytics.uptime}%</Text>
                            </Box>
                        </VStack>
                    </TabPanel>
                </TabPanels>
            </Tabs>
        </Box>
    );
} 