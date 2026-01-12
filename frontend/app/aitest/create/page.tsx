'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AssessmentForm from '../../../components/AssessmentForm';
import { AssessmentConfig } from '../../../types/types';
import axios from 'axios';
import { useAppStore } from '@/store/useAppStore';

const CreateTestPageContent: React.FC = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [course_id, setCourseId] = useState('');
    const [user_id, setUserId] = useState('');
    const { profile } = useAppStore();

    useEffect(() => {
        if (profile?.role !== 'teacher') {
            router.push('/');
        }
    }, [profile, router]);

    useEffect(() => {
        const courseIdParam = searchParams.get('course_id');
        const userIdParam = searchParams.get('user_id');

        if (courseIdParam) {
            setCourseId(courseIdParam);
        }
        if (userIdParam) {
            setUserId(userIdParam);
        }
    }, [searchParams]);


    const handleStartSetup = async (config: AssessmentConfig) => {
        // Save config to local storage to be accessed by the start page
        if (typeof window !== 'undefined') {
            localStorage.setItem('assessment_config', JSON.stringify(config));
        }
        console.log(config);
        // call api to create a test
        await axios.post('http://localhost:4000/material/tests/test-create', {
            title: config.title,
            questions: config.questions,
            course_id: course_id,
            user_id: user_id,
            valid_until: config.validUntil,
        }, { withCredentials: true });
        alert('Test created successfully.');
        router.push('/teacher/courses');
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4">
            <div className="w-full max-w-4xl">
                <AssessmentForm onStart={handleStartSetup} course_id={course_id} />
            </div>
        </div>
    );
};

const CreateTestPage: React.FC = () => {
    return (
        <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>}>
            <CreateTestPageContent />
        </Suspense>
    );
};

export default CreateTestPage;
