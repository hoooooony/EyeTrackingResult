import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import Papa from 'papaparse';
import logo from './assets/logoBlack.png'; 
import './App.css';

const App = () => {
  const imgSrc = "https://assets.newatlas.com/dims4/default/2123580/2147483647/strip/true/crop/3240x2160+428+0/resize/1920x1280!/quality/90/?url=http%3A%2F%2Fnewatlas-brightspot.s3.amazonaws.com%2Fc8%2F26%2Fefc5ffc64defb3dc990963603ebc%2Fdepositphotos-154359588-xl-2015.jpg";
  const [fullData, setFullData] = useState([]); // 전체 데이터 캔버스용
  const [sequentialData, setSequentialData] = useState([]); // 순차 데이터 캔버스용
  const [parsedData, setParsedData] = useState([]); // 전체 파싱된 데이터 저장
  const [currentPoint, setCurrentPoint] = useState(0); // 현재 표시할 데이터 인덱스
  const [gazeTransitionTimeAverage, setGazeTransitionTimeAverage] = useState(0); // gazeTransitionTime 평균값 저장
  const [totalClickCount, setTotalClickCount] = useState(0); // 클릭 횟수 저장
  const [fileName, setFileName] = useState(''); // 추가된 파일 이름 저장
  const [layout, setLayout] = useState({
    margin: { l: 0, r: 0, b: 0, t: 0 },
    scene: {
      xaxis: { title: 'X' },
      yaxis: { title: 'Y' },
      zaxis: { title: 'Z' },
    },
  });

  const threshold = 0.6036 * (1 - 0.2573); // 0.2367의 25.73% 아래 값

  useEffect(() => {
    if (parsedData.length > 0) {
      const gazeTransitionTimes = parsedData.map(data => data.gazeTransitionTime || 0);
      const average = gazeTransitionTimes.reduce((acc, val) => acc + val, 0) / gazeTransitionTimes.length;
      setGazeTransitionTimeAverage(average);
      
      const clickCounts = parsedData.map(data => data.clickCount || 0);
      const totalClicks = clickCounts.reduce((acc, val) => acc + val, 0);
      setTotalClickCount(totalClicks);
    }
  }, [parsedData]);

  useEffect(() => {
    if (currentPoint < parsedData.length) {
      const delayTime = (parsedData[currentPoint].gazeDuration + parsedData[currentPoint].gazeTransitionTime) * 1000; // Duration time과 Transition time을 밀리초 단위로 변환
      const timer = setTimeout(() => {
        setSequentialData(prevSequentialData => [
          ...prevSequentialData,
          {
            x: [parsedData[currentPoint].x],
            y: [parsedData[currentPoint].y],
            z: [parsedData[currentPoint].z],
            mode: 'markers',
            type: 'scatter3d',
            marker: {
              size: 4,
              color: [parsedData[currentPoint].marker.color]
            }
          }
        ]);
        setCurrentPoint(currentPoint + 1);
      }, delayTime);
      return () => clearTimeout(timer);
    }
  }, [currentPoint, parsedData]);

  const handleFileChange = (event) => {
    const file = event.target.files[0]; 
    setFileName(file.name); // 파일 이름 저장

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      complete: (results) => {
        const traceData = results.data.filter(row => row.X !== undefined && row.Y !== undefined && row.Z !== undefined)
          .map(row => ({
            x: row.X,
            y: row.Z,
            z: row.Y,
            gazeDuration: row.gazeDuration || 0, // 기본값 0 처리
            gazeTransitionTime: row.gazeTransitionTime || 0, // 기본값 0 처리
            clickCount: row.clickCount || 0, // 기본값 0 처리
            marker: {
              color: getColor(row.gazeTransitionTime)
            }
          }));

        // 첫 번째 점을 제외한 데이터 사용
        const filteredData = traceData.slice(1);

        console.log(filteredData); // 데이터 디버깅

        setParsedData(filteredData);
        setFullData([{
          x: filteredData.map(p => p.x),
          y: filteredData.map(p => p.y),
          z: filteredData.map(p => p.z),
          mode: 'lines+markers',
          type: 'scatter3d',
          line: { width: 2 },
          marker: { size: 4, color: filteredData.map(p => p.marker.color) }
        }]);
        setSequentialData([]); // 시퀀셜 데이터를 초기화합니다.
        setCurrentPoint(0);
      },
    });
  };

  const getColor = (gazeTransitionTime) => {
    if (gazeTransitionTime === 0) {
      return 'rgba(0, 0, 255, 0.2)'; // 파랑색 투명도 0.2 고정
    }
    return `rgba(255, 0, 0, ${Math.min(Math.max(gazeTransitionTime / 10, 0), 1)})`; // 빨강색
  };

  return (
    <>
      <header className='header'>
        <img src={logo} alt='logo' className='logo'/>
      </header>
      <div className='container'>
        <div className='file-input-container'>
          <div className='img-container'>
            <img src={imgSrc} alt='이미지 없음' className='eye-tracking-img'/>
            <div className='file-input-text'>시선 정보를 분석해보세요</div>
          </div>
          <div className='file-input-condition'>
            <label htmlFor='file-input' className='file-input-label'>시선 정보 추가</label>
            <span className='file-input-condition-text'>.csv파일을 추가해주세요</span>
            <input id='file-input' className='file-input' type="file" accept=".csv" onChange={handleFileChange} />
            {fileName && <span className='file-input-filename'>{fileName}</span>}
          </div>
          <div className='value-container'>
            <div className='saccud-container'>
              <div className='saccud-text'>
                평균 싸커드 전환시간
              </div>
              <div className='saccud-value' style={{ color: gazeTransitionTimeAverage < threshold ? '#FF0000' : '#7ED8E5' }}>
                {gazeTransitionTimeAverage.toFixed(5)} ms
              </div>
            </div>
            <div className='click-count-container'>
              <div className='click-count-text'>
                트래커 클릭 횟수
              </div>
              <div className='click-count-value'>
                {totalClickCount}
              </div>
            </div>
          </div>
        </div>
        <span className='title'>전체 시선 경로</span>
        <div className='canvas'>
          <Plot
            data={fullData}
            layout={layout}
            style={{ width: '100%', height: '400px' }}
          />
        </div>
        <span className='title'>시선 순서 경로</span>
        <div className='canvas'>
          <Plot
            data={sequentialData}
            layout={layout}
            style={{ width: '100%', height: '400px' }}
          />
        </div>
      </div>
    </>
  );
};

export default App;
