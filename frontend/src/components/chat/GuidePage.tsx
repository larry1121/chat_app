// components/chat/GuidePage.tsx
import React from 'react';
import styled from 'styled-components';
import logo from './kuplace_icon.png'; // 현재 폴더 내의 logo.png를 import
interface GuidePageProps {
  onExampleQuestionClick: (question: string) => void;
}

export const GuidePage: React.FC<GuidePageProps> = ({ onExampleQuestionClick }) => {
  const exampleQuestions = [
    "공학관에서 팀플하기 좋은 장소가 있나요?",
    "문캠에서 핸드폰 충전을 할 수 있는 곳이 있나요?",
    "과방 출입 신청 방법을 알려주세요.",
    "고려대학교 4·18 기념관에는 어떤 시설들이 있나요?"
  ];

  return (
    <GuideContainer>
      <Logo src={logo} alt="쿠플톡 로고" />
      <Title>쿠플톡</Title>

      <QuestionsContainer>
        {exampleQuestions.map((question, index) => (
          <QuestionButton key={index} onClick={() => onExampleQuestionClick(question)}>
            {question}
          </QuestionButton>
        ))}
      </QuestionsContainer>
    </GuideContainer>
  );
};

const GuideContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
`;

const Logo = styled.img`
  margin-bottom: 20px;
  width: 100px; /* 로고의 너비를 설정합니다 */
  height: auto; /* 높이를 자동으로 설정하여 비율을 유지합니다 */
  border-radius: 10px; /* 모서리를 둥글게 만듭니다 */
`;

const QuestionsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const QuestionButton = styled.button`
  padding: 10px 20px;
  font-size: 16px;
  cursor: pointer;
  border-radius: 10px; /* 모서리를 둥글게 만듭니다 */
  transition: background-color 0.3s ease; /* 색상 변환에 부드러운 전환 효과를 추가합니다 */
  background-color: #f4f4f4;

  &:hover {
    background-color: #cd7270; /* 호버 시 배경색을 변경합니다 */
  }
`;
const Title = styled.h1``
  
;

export default GuidePage;
