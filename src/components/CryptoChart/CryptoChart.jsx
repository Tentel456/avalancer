import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import './CryptoChart.css';

const CryptoChart = ({ coinId, symbol }) => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeframe, setTimeframe] = useState('7'); // 7 days default

  useEffect(() => {
    if (coinId) {
      fetchChartData();
    }
  }, [coinId, timeframe]);

  const fetchChartData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${timeframe}`,
        {
          headers: {
            'Accept': 'application/json',
          }
        }
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();

      if (data.prices && data.prices.length > 0) {
        // Convert data to recharts format
        const formattedData = data.prices.map(([timestamp, price]) => ({
          time: new Date(timestamp).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            ...(timeframe === '1' ? { hour: '2-digit' } : {})
          }),
          price: parseFloat(price.toFixed(2)),
          timestamp: timestamp
        }));

        setChartData(formattedData);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching chart data:', error);
      setError(error.message || 'Failed to load chart data');
      setLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-price">${payload[0].value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="tooltip-time">{payload[0].payload.time}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="crypto-chart">
      <div className="chart-header">
        <h3>Price Chart</h3>
        <div className="chart-timeframe-buttons">
          <button
            className={timeframe === '1' ? 'active' : ''}
            onClick={() => setTimeframe('1')}
          >
            24H
          </button>
          <button
            className={timeframe === '7' ? 'active' : ''}
            onClick={() => setTimeframe('7')}
          >
            7D
          </button>
          <button
            className={timeframe === '30' ? 'active' : ''}
            onClick={() => setTimeframe('30')}
          >
            30D
          </button>
          <button
            className={timeframe === '90' ? 'active' : ''}
            onClick={() => setTimeframe('90')}
          >
            90D
          </button>
          <button
            className={timeframe === '365' ? 'active' : ''}
            onClick={() => setTimeframe('365')}
          >
            1Y
          </button>
        </div>
      </div>

      {loading && (
        <div className="chart-loading">
          <i className="ph-spinner"></i>
          <p>Loading chart...</p>
        </div>
      )}

      {error && (
        <div className="chart-error">
          <i className="ph-warning-circle"></i>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && chartData.length > 0 && (
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4a6741" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#4a6741" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time"
                stroke="#999"
                style={{ fontSize: '0.75rem' }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="#999"
                style={{ fontSize: '0.75rem' }}
                tickLine={false}
                tickFormatter={(value) => `$${value.toLocaleString()}`}
                domain={['auto', 'auto']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="price"
                stroke="#4a6741"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorPrice)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default CryptoChart;
